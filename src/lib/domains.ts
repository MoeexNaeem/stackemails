import { Domain, Inbox, Workspace } from "@/lib/db/models";
import { limitsFor } from "@/lib/plans";
import { checkDomainAvailable } from "@/lib/email/guards";
import { buildDnsRecords, mailFromDomain } from "@/lib/dns";
import type { Types } from "mongoose";
import { promises as dns } from "node:dns";
import type { HydratedDocument } from "mongoose";
import type { DomainDoc } from "@/lib/db/models";
import { getEmailProvider } from "@/lib/email";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { env } from "@/lib/env";

const norm = (s: string) => s.trim().toLowerCase().replace(/\.$/, "");

/** Look up one record in public DNS and report whether it matches what we asked for. */
async function recordPresent(r: { type: string; name: string; value: string }): Promise<boolean> {
  try {
    if (r.type === "CNAME") {
      const got = await dns.resolveCname(r.name);
      return got.some((v) => norm(v) === norm(r.value));
    }
    if (r.type === "MX") {
      const got = await dns.resolveMx(r.name);
      return got.some((m) => norm(m.exchange) === norm(r.value));
    }
    if (r.type === "TXT") {
      const got = (await dns.resolveTxt(r.name)).map((chunks) => chunks.join(""));
      if (r.value.startsWith("v=spf1")) return got.some((t) => t.startsWith("v=spf1") && t.includes("include:amazonses.com"));
      if (r.value.startsWith("v=DMARC1")) return got.some((t) => t.startsWith("v=DMARC1"));
      return got.some((t) => t === r.value);
    }
  } catch {
    return false; // NXDOMAIN / no data / timeout
  }
  return false;
}

/**
 * Re-check a domain: each DNS record individually (so the UI can show exactly
 * which one is missing) plus the provider's own DKIM verification. Mock mode
 * verifies instantly so the flow is explorable without real DNS.
 */
export async function verifyDomain(domain: HydratedDocument<DomainDoc>): Promise<{ verified: boolean; changed: boolean }> {
  const wasVerified = domain.status === "verified";
  if (env.emailProvider === "mock") {
    domain.records.forEach((r) => (r.status = "verified"));
    domain.status = "verified";
  } else {
    const results = await Promise.all(domain.records.map((r) => recordPresent(r)));
    domain.records.forEach((r, i) => (r.status = results[i] ? "verified" : "pending"));
    const providerStatus = await getEmailProvider().getDomainStatus(domain.name, domain.region);
    // Sending is allowed once SES has verified DKIM; SPF/DMARC/MX are reported per record.
    domain.status = providerStatus === "verified" ? "verified" : providerStatus === "failed" && domain.createdAt.getTime() < Date.now() - 72 * 3600_000 ? "failed" : "pending";
    if (providerStatus === "verified") domain.records.filter((r) => r.purpose === "DKIM").forEach((r) => (r.status = "verified"));
  }
  domain.lastCheckedAt = new Date();
  const verified = domain.status === "verified";
  if (verified && !wasVerified) {
    domain.verifiedAt = domain.verifiedAt ?? new Date();
    domain.events.push({ type: "dns_verified", at: new Date() }, { type: "verified", at: new Date() });
  } else if (domain.status === "failed" && !domain.events.some((e) => e.type === "failed")) {
    domain.events.push({ type: "failed", at: new Date() });
  }
  await domain.save();
  if (verified && !wasVerified) {
    await emitEvent(String(domain.workspaceId), "domain.verified", { domain_id: String(domain._id), name: domain.name });
  }
  return { verified, changed: verified !== wasVerified };
}

// ── Create / delete / receiving (shared by dashboard actions and the REST API) ──

export type DomainInput = {
  name: string;
  returnPath?: string;
  trackingSubdomain?: string;
  clickTracking?: boolean;
  openTracking?: boolean;
};

export async function createDomain(workspaceId: Types.ObjectId, input: DomainInput) {
  const available = await checkDomainAvailable(workspaceId, input.name);
  if (!available.ok) return { ok: false as const, status: 409, code: available.code, message: available.message };
  const ws = await Workspace.findById(workspaceId).select("plan").lean();
  const max = limitsFor(ws?.plan).domains;
  if ((await Domain.countDocuments({ workspaceId })) >= max) {
    return { ok: false as const, status: 403, code: "plan_limit", message: `Your plan allows ${max} domain${max === 1 ? "" : "s"}. Upgrade on Settings → Billing to add more.` };
  }

  // Domains must live in the region we send from, or SES won't accept the sender.
  const region = env.aws.region;
  const returnPath = (input.returnPath || "send").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "send";
  let identity;
  try {
    identity = await getEmailProvider().createDomainIdentity(input.name, region, { mailFrom: mailFromDomain(input.name, returnPath) });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    console.error("[domains] createDomainIdentity failed", err);
    if (name === "AlreadyExistsException") return { ok: false as const, status: 409, code: "domain_taken", message: "This domain is already registered to another account." };
    return { ok: false as const, status: 502, code: "provider_error", message: "Could not register the domain with the email provider. Try again shortly." };
  }
  const domain = await Domain.create({
    workspaceId,
    name: input.name,
    region,
    returnPath,
    trackingSubdomain: input.trackingSubdomain ?? "",
    clickTracking: input.clickTracking ?? false,
    openTracking: input.openTracking ?? false,
    status: "pending",
    records: buildDnsRecords(input.name, identity.dkimTokens, { region, returnPath }),
    awsIdentityArn: identity.arn,
    dkimTokens: identity.dkimTokens,
    events: [{ type: "added", at: new Date() }],
  });
  emitEvent(String(workspaceId), "domain.created", { domain_id: String(domain._id), name: domain.name }).catch(() => {});
  return { ok: true as const, domain };
}

export async function deleteDomain(workspaceId: Types.ObjectId, id: string) {
  const domain = await Domain.findOne({ _id: id, workspaceId });
  if (!domain) return false;
  await getEmailProvider().deleteDomainIdentity?.(domain.name, domain.region).catch((err) => console.error("[domains] delete identity failed", err));
  await Inbox.deleteMany({ workspaceId, domainId: domain._id });
  await domain.deleteOne();
  emitEvent(String(workspaceId), "domain.deleted", { domain_id: id, name: domain.name }).catch(() => {});
  return true;
}

/** Toggle inbound receiving on a domain (adds/removes the root MX record). */
export async function setReceiving(domain: HydratedDocument<DomainDoc>, enabled: boolean) {
  domain.receivingEnabled = enabled;
  const others = domain.records.filter((r) => !(r.purpose === "MX" && r.name === domain.name));
  if (enabled) others.push({ type: "MX", name: domain.name, value: `inbound-smtp.${domain.region}.amazonaws.com`, priority: 10, purpose: "MX", status: "pending" } as never);
  domain.records = others as never;
  await domain.save();
}
