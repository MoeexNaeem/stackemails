"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { redirect } from "next/navigation";
import {
  ApiKey,
  Audience,
  Automation,
  Broadcast,
  Contact,
  Domain,
  EmailLog,
  Template,
  User,
  Webhook,
  Workspace,
  type WorkspaceDoc,
} from "@/lib/db/models";
import { getStarter } from "@/lib/templates/starters";
import { runAutomationsForContact } from "@/lib/automations/run";
import { generateApiKey } from "@/lib/auth/apiKey";
import { getEmailProvider } from "@/lib/email";
import { getEmailQueue } from "@/lib/queue";
import { prefixedId } from "@/lib/ids";
import { buildDnsRecords } from "@/lib/dns";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { renderEmail, WelcomeEmail } from "@/emails";
import { sendBroadcast } from "@/lib/broadcast";
import {
  createApiKeySchema,
  createAudienceSchema,
  createContactSchema,
  createDomainSchema,
  createWebhookSchema,
  sendEmailSchema,
} from "@/lib/validation/schemas";

async function requireWorkspace(): Promise<WorkspaceDoc> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  const workspace = await getActiveWorkspace(user);
  if (!workspace) throw new Error("No workspace");
  return workspace;
}

export type ActionState = { ok: boolean; error?: string; secret?: string };

// ── API keys ──────────────────────────────────────────────
export async function createApiKeyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const parsed = createApiKeySchema.safeParse({
    name: formData.get("name"),
    mode: formData.get("mode") ?? "live",
    permission: formData.get("permission") ?? "full_access",
    domainScope: formData.get("domainScope") ?? "all",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const { raw, keyHash, last4, keyPrefix } = generateApiKey(parsed.data.mode);
  await connectToDatabase();
  await ApiKey.create({
    workspaceId: workspace._id,
    name: parsed.data.name,
    mode: parsed.data.mode,
    permission: parsed.data.permission,
    domainScope: parsed.data.domainScope,
    keyHash,
    last4,
    keyPrefix,
  });

  revalidatePath("/api-keys");
  // The raw key is returned exactly once and never persisted.
  return { ok: true, secret: raw };
}

export async function revokeApiKeyAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await ApiKey.updateOne(
    { _id: id, workspaceId: workspace._id },
    { $set: { revokedAt: new Date() } },
  );
  revalidatePath("/api-keys");
}

// ── Domains ───────────────────────────────────────────────
export async function createDomainAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const parsed = createDomainSchema.safeParse({
    name: formData.get("name"),
    region: formData.get("region") || "us-east-1",
    returnPath: formData.get("returnPath") || "send",
    trackingSubdomain: formData.get("trackingSubdomain") || "",
    clickTracking: formData.get("clickTracking") === "on" || formData.get("clickTracking") === "true",
    openTracking: formData.get("openTracking") === "on" || formData.get("openTracking") === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  await connectToDatabase();
  const existing = await Domain.findOne({ workspaceId: workspace._id, name: parsed.data.name });
  if (existing) return { ok: false, error: "Domain already registered." };

  const identity = await getEmailProvider().createDomainIdentity(
    parsed.data.name,
    parsed.data.region,
  );
  await Domain.create({
    workspaceId: workspace._id,
    name: parsed.data.name,
    region: parsed.data.region,
    returnPath: parsed.data.returnPath,
    trackingSubdomain: parsed.data.trackingSubdomain,
    clickTracking: parsed.data.clickTracking,
    openTracking: parsed.data.openTracking,
    status: "pending",
    records: buildDnsRecords(parsed.data.name, identity.dkimTokens),
    awsIdentityArn: identity.arn,
    dkimTokens: identity.dkimTokens,
    events: [{ type: "added", at: new Date() }],
  });

  revalidatePath("/domains");
  return { ok: true };
}

export async function verifyDomainAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  const domain = await Domain.findOne({ _id: id, workspaceId: workspace._id });
  if (!domain) return;

  const status = await getEmailProvider().getDomainStatus(domain.name, domain.region);
  const wasVerified = domain.status === "verified";
  domain.status = status;
  domain.lastCheckedAt = new Date();
  if (status === "verified") {
    domain.verifiedAt = domain.verifiedAt ?? new Date();
    domain.records.forEach((r) => {
      r.status = "verified";
    });
    if (!wasVerified) {
      domain.events.push({ type: "dns_verified", at: new Date() });
      domain.events.push({ type: "verified", at: new Date() });
    }
  }
  await domain.save();

  if (status === "verified" && !wasVerified) {
    await emitEvent(String(workspace._id), "domain.verified", {
      domain_id: String(domain._id),
      name: domain.name,
    });
  }
  revalidatePath("/domains");
}

export async function deleteDomainAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Domain.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/domains");
}

export async function setDomainTlsAction(id: string, mode: "opportunistic" | "enforced"): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Domain.updateOne({ _id: id, workspaceId: workspace._id }, { $set: { tlsMode: mode } });
  revalidatePath(`/domains/${id}`);
}

// ── Emails (dashboard test send) ──────────────────────────
export async function sendTestEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const parsed = sendEmailSchema.safeParse({
    from: formData.get("from"),
    to: formData.get("to"),
    subject: formData.get("subject"),
    html: formData.get("html") || undefined,
    text: formData.get("text") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  if ((workspace.usage?.sent ?? 0) >= workspace.monthlyQuota) {
    return { ok: false, error: "Monthly send quota reached." };
  }

  await connectToDatabase();
  const log = await EmailLog.create({
    workspaceId: workspace._id,
    messageId: prefixedId("msg"),
    from: parsed.data.from,
    to: parsed.data.to,
    replyTo: parsed.data.reply_to ?? [],
    subject: parsed.data.subject,
    html: parsed.data.html,
    text: parsed.data.text,
    status: "queued",
    events: [{ type: "queued", at: new Date() }],
  });

  await getEmailQueue().enqueue({
    emailId: String(log._id),
    workspaceId: String(workspace._id),
  });

  revalidatePath("/emails");
  revalidatePath("/overview");
  return { ok: true };
}

// ── React Email template send ─────────────────────────────
export async function sendWelcomeTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const to = String(formData.get("to") ?? "").trim();
  const from = String(formData.get("from") ?? "").trim();
  if (!to || !from) return { ok: false, error: "From and to are required." };

  if ((workspace.usage?.sent ?? 0) >= workspace.monthlyQuota) {
    return { ok: false, error: "Monthly send quota reached." };
  }

  // Render the React Email component to HTML on the server, then queue it.
  const html = await renderEmail(
    createElement(WelcomeEmail, { name: to.split("@")[0], product: workspace.name }),
  );

  await connectToDatabase();
  const log = await EmailLog.create({
    workspaceId: workspace._id,
    messageId: prefixedId("msg"),
    from,
    to: [to],
    subject: `Welcome to ${workspace.name} 👋`,
    html,
    status: "queued",
    events: [{ type: "queued", at: new Date() }],
  });
  await getEmailQueue().enqueue({
    emailId: String(log._id),
    workspaceId: String(workspace._id),
  });

  revalidatePath("/emails");
  return { ok: true };
}

// ── Audiences & contacts ──────────────────────────────────
export async function createAudienceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const parsed = createAudienceSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  await connectToDatabase();
  await Audience.create({ workspaceId: workspace._id, name: parsed.data.name });
  revalidatePath("/audiences");
  return { ok: true };
}

export async function deleteAudienceAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Audience.deleteOne({ _id: id, workspaceId: workspace._id });
  await Contact.deleteMany({ audienceId: id, workspaceId: workspace._id });
  revalidatePath("/audiences");
}

export async function addContactAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const audienceId = String(formData.get("audienceId") ?? "");
  const parsed = createContactSchema.safeParse({
    email: formData.get("email"),
    first_name: formData.get("first_name") || undefined,
    last_name: formData.get("last_name") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  await connectToDatabase();
  const audience = await Audience.findOne({ _id: audienceId, workspaceId: workspace._id });
  if (!audience) return { ok: false, error: "Audience not found." };

  try {
    await Contact.create({
      workspaceId: workspace._id,
      audienceId,
      email: parsed.data.email,
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
    });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return { ok: false, error: "That email is already in this audience." };
    }
    throw err;
  }
  runAutomationsForContact(workspace._id, { email: parsed.data.email, audienceId }).catch(() => {});
  revalidatePath(`/audiences/${audienceId}`);
  return { ok: true };
}

export async function importContactsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const audienceId = String(formData.get("audienceId") ?? "");
  const raw = String(formData.get("emails") ?? "");
  await connectToDatabase();
  const audience = await Audience.findOne({ _id: audienceId, workspaceId: workspace._id });
  if (!audience) return { ok: false, error: "Choose an audience to import into." };

  const emails = Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
    ),
  );
  if (emails.length === 0) return { ok: false, error: "No valid email addresses found." };

  let added = 0;
  for (const email of emails) {
    try {
      await Contact.create({ workspaceId: workspace._id, audienceId, email });
      added++;
      runAutomationsForContact(workspace._id, { email, audienceId }).catch(() => {});
    } catch {
      /* duplicate — skip */
    }
  }
  revalidatePath("/audiences");
  return { ok: true, error: `Imported ${added} of ${emails.length} contacts.` };
}

export async function deleteContactAction(id: string, audienceId: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Contact.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath(`/audiences/${audienceId}`);
}

export async function sendBroadcastAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const audienceId = String(formData.get("audienceId") ?? "");
  const from = String(formData.get("from") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const html = String(formData.get("html") ?? "").trim();
  if (!from || !subject || !html) return { ok: false, error: "From, subject and body are required." };

  await connectToDatabase();
  const audience = await Audience.findOne({ _id: audienceId, workspaceId: workspace._id });
  if (!audience) return { ok: false, error: "Audience not found." };

  const { queued } = await sendBroadcast({
    workspaceId: workspace._id,
    audienceId,
    from,
    subject,
    html,
  });
  revalidatePath("/emails");
  revalidatePath(`/audiences/${audienceId}`);
  return { ok: true, error: queued === 0 ? "No subscribed contacts to send to." : undefined };
}

// ── Broadcasts (first-class entity) ───────────────────────
export async function createBroadcastAction(): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  const verified = await Domain.findOne({ workspaceId: workspace._id, status: "verified" }).lean();
  const bc = await Broadcast.create({
    workspaceId: workspace._id,
    name: "Untitled",
    status: "draft",
    from: verified ? `${workspace.name} <hello@${verified.name}>` : "",
    subject: "",
  });
  revalidatePath("/broadcasts");
  redirect(`/broadcasts/${bc._id}`);
}

export async function saveBroadcastAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  await connectToDatabase();
  const bc = await Broadcast.findOne({ _id: id, workspaceId: workspace._id });
  if (!bc) return { ok: false, error: "Broadcast not found." };

  bc.name = String(formData.get("name") || "Untitled");
  bc.from = String(formData.get("from") || "");
  bc.replyTo = String(formData.get("replyTo") || "");
  bc.subject = String(formData.get("subject") || "");
  bc.previewText = String(formData.get("previewText") || "");
  bc.html = String(formData.get("html") || "");
  bc.design = String(formData.get("design") || "");
  const audienceId = String(formData.get("audienceId") || "");
  bc.audienceId = audienceId ? (audienceId as unknown as typeof bc.audienceId) : undefined;
  await bc.save();

  revalidatePath("/broadcasts");
  revalidatePath(`/broadcasts/${id}`);
  return { ok: true };
}

export async function sendBroadcastEntityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  await connectToDatabase();
  const bc = await Broadcast.findOne({ _id: id, workspaceId: workspace._id });
  if (!bc) return { ok: false, error: "Broadcast not found." };
  if (!bc.audienceId) return { ok: false, error: "Choose an audience first." };
  if (!bc.from || !bc.subject || !bc.html) {
    return { ok: false, error: "From, subject and content are required." };
  }

  const { queued } = await sendBroadcast({
    workspaceId: workspace._id,
    audienceId: String(bc.audienceId),
    from: bc.from,
    subject: bc.subject,
    html: bc.html,
  });

  bc.status = "sent";
  bc.sentAt = new Date();
  bc.stats = { recipients: queued, delivered: 0, opened: 0, clicked: 0 };
  await bc.save();

  revalidatePath("/broadcasts");
  revalidatePath("/emails");
  return { ok: true, error: queued === 0 ? "No subscribed contacts in that audience." : undefined };
}

export async function deleteBroadcastAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Broadcast.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/broadcasts");
}

// ── Templates ─────────────────────────────────────────────
export async function createTemplateAction(formData: FormData): Promise<void> {
  const workspace = await requireWorkspace();
  const starterId = String(formData.get("starterId") ?? "blank");
  const starter = getStarter(starterId) ?? getStarter("blank")!;
  await connectToDatabase();
  const tpl = await Template.create({
    workspaceId: workspace._id,
    name: starter.name === "Blank" ? "Untitled template" : starter.name,
    subject: starter.subject,
    html: starter.html,
    category: starter.category,
  });
  revalidatePath("/templates");
  redirect(`/templates/${tpl._id}`);
}

export async function saveTemplateAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  await connectToDatabase();
  const tpl = await Template.findOne({ _id: id, workspaceId: workspace._id });
  if (!tpl) return { ok: false, error: "Template not found." };
  tpl.name = String(formData.get("name") || "Untitled template");
  tpl.subject = String(formData.get("subject") || "");
  tpl.html = String(formData.get("html") || "");
  await tpl.save();
  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  return { ok: true };
}

export async function deleteTemplateAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Template.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/templates");
}

// ── Automations ───────────────────────────────────────────
export async function createAutomationAction(): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  const auto = await Automation.create({
    workspaceId: workspace._id,
    name: "Untitled automation",
    status: "draft",
    trigger: "contact.added",
    steps: [
      { type: "wait", waitDuration: 1, waitUnit: "days" },
      { type: "email", subject: "Welcome!", from: "", html: "<h1>Welcome</h1>" },
    ],
  });
  revalidatePath("/automations");
  redirect(`/automations/${auto._id}`);
}

export async function toggleAutomationAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  const a = await Automation.findOne({ _id: id, workspaceId: workspace._id });
  if (!a) return;
  a.status = a.status === "active" ? "paused" : "active";
  await a.save();
  revalidatePath("/automations");
  revalidatePath(`/automations/${id}`);
}

export async function deleteAutomationAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Automation.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/automations");
}

// ── Settings: Team ────────────────────────────────────────
export async function updateTeamNameAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "Team name is required." };
  await connectToDatabase();
  await Workspace.updateOne({ _id: workspace._id }, { $set: { name } });
  revalidatePath("/settings/team");
  return { ok: true };
}

// ── Settings: Billing ─────────────────────────────────────
export async function updateBillingEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const billingEmail = String(formData.get("billingEmail") ?? "").trim();
  await connectToDatabase();
  await Workspace.updateOne({ _id: workspace._id }, { $set: { billingEmail } });
  revalidatePath("/settings/billing");
  return { ok: true };
}

export async function updateBillingAddressAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Workspace.updateOne(
    { _id: workspace._id },
    {
      $set: {
        "billing.fullName": String(formData.get("fullName") ?? ""),
        "billing.country": String(formData.get("country") ?? "United States"),
        "billing.addressLine1": String(formData.get("addressLine1") ?? ""),
      },
    },
  );
  revalidatePath("/settings/billing");
  return { ok: true };
}

export async function updateTaxIdAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Workspace.updateOne(
    { _id: workspace._id },
    {
      $set: {
        "billing.taxIdType": String(formData.get("taxIdType") ?? "European VAT number"),
        "billing.taxId": String(formData.get("taxId") ?? ""),
      },
    },
  );
  revalidatePath("/settings/billing");
  return { ok: true };
}

// ── Profile ───────────────────────────────────────────────
export async function updateProfileEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
  await connectToDatabase();
  const existing = await User.findOne({ email, _id: { $ne: user._id } });
  if (existing) return { ok: false, error: "That email is already in use." };
  await User.updateOne({ _id: user._id }, { $set: { email } });
  revalidatePath("/profile");
  return { ok: true };
}

// ── Webhooks ──────────────────────────────────────────────
export async function createWebhookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const events = formData.getAll("events").map(String).filter(Boolean);
  const parsed = createWebhookSchema.safeParse({
    url: formData.get("url"),
    events,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  await connectToDatabase();
  await Webhook.create({
    workspaceId: workspace._id,
    url: parsed.data.url,
    events: parsed.data.events,
    enabled: true,
  });
  revalidatePath("/webhooks");
  return { ok: true };
}

export async function toggleWebhookAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  const wh = await Webhook.findOne({ _id: id, workspaceId: workspace._id });
  if (!wh) return;
  wh.enabled = !wh.enabled;
  await wh.save();
  revalidatePath("/webhooks");
}

export async function deleteWebhookAction(id: string): Promise<void> {
  const workspace = await requireWorkspace();
  await connectToDatabase();
  await Webhook.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/webhooks");
}
