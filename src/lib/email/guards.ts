import { Domain, Suppression } from "@/lib/db/models";
import { env } from "@/lib/env";
import type { Types } from "mongoose";

type Id = Types.ObjectId | string;

export type GuardResult = { ok: true } | { ok: false; code: string; message: string };

/** "Acme <hello@mail.acme.com>" → "mail.acme.com" */
export function senderDomain(from: string): string | null {
  const addr = /<([^>]+)>/.exec(from)?.[1] ?? from;
  const at = addr.trim().lastIndexOf("@");
  if (at < 1) return null;
  const domain = addr.trim().slice(at + 1).toLowerCase();
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain) ? domain : null;
}

/** The domain itself plus every parent: mail.acme.com → [mail.acme.com, acme.com]. */
function domainAndParents(domain: string): string[] {
  const parts = domain.split(".");
  const out: string[] = [];
  for (let i = 0; i <= parts.length - 2; i++) out.push(parts.slice(i).join("."));
  return out;
}

/**
 * A workspace may only send from a domain (or subdomain of a domain) that it
 * has verified. Without this, any tenant could send as any domain verified in
 * the shared SES account - including stackemails.com or another customer's.
 */
export async function assertSenderAllowed(workspaceId: Id, from: string): Promise<GuardResult> {
  const domain = senderDomain(from);
  if (!domain) {
    return { ok: false, code: "invalid_from", message: "`from` must be a valid email address, e.g. \"Acme <hello@acme.com>\"." };
  }
  const verified = await Domain.exists({
    workspaceId,
    name: { $in: domainAndParents(domain) },
    status: "verified",
  });
  if (!verified) {
    return {
      ok: false,
      code: "domain_not_verified",
      message: `The ${domain} domain is not verified. Add and verify it on the Domains page before sending from it.`,
    };
  }
  return { ok: true };
}

/** Split recipients into those we may send to and those on the suppression list. */
export async function partitionSuppressed(
  workspaceId: Id,
  recipients: string[],
): Promise<{ allowed: string[]; suppressed: string[] }> {
  if (recipients.length === 0) return { allowed: [], suppressed: [] };
  const rows = await Suppression.find({
    workspaceId,
    email: { $in: recipients.map((r) => r.trim().toLowerCase()) },
  })
    .select("email")
    .lean();
  const blocked = new Set(rows.map((r) => r.email));
  const allowed: string[] = [];
  const suppressed: string[] = [];
  for (const r of recipients) (blocked.has(r.trim().toLowerCase()) ? suppressed : allowed).push(r);
  return { allowed, suppressed };
}

/**
 * Can this workspace register `name`? SES verification is account-wide, so a
 * domain already claimed by another workspace (or the platform's own sending
 * domain) must not be registrable - it would inherit "verified" without the
 * tenant proving DNS control.
 */
export async function checkDomainAvailable(workspaceId: Id, name: string): Promise<GuardResult> {
  const systemDomain = senderDomain(env.systemFromEmail);
  if (systemDomain && domainAndParents(name).includes(systemDomain)) {
    return { ok: false, code: "domain_reserved", message: "This domain is reserved and can't be added." };
  }
  const existing = await Domain.findOne({ name }).select("workspaceId").lean();
  if (existing) {
    return String(existing.workspaceId) === String(workspaceId)
      ? { ok: false, code: "domain_exists", message: "Domain already registered." }
      : { ok: false, code: "domain_taken", message: "This domain is already registered to another account." };
  }
  return { ok: true };
}
