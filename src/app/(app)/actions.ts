"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import {
  ApiKey,
  Audience,
  Contact,
  Domain,
  EmailLog,
  Webhook,
  type WorkspaceDoc,
} from "@/lib/db/models";
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
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const { raw, keyHash, last4 } = generateApiKey(parsed.data.mode);
  await connectToDatabase();
  await ApiKey.create({
    workspaceId: workspace._id,
    name: parsed.data.name,
    mode: parsed.data.mode,
    keyHash,
    last4,
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
    status: "pending",
    records: buildDnsRecords(parsed.data.name, identity.dkimTokens),
    awsIdentityArn: identity.arn,
    dkimTokens: identity.dkimTokens,
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
  revalidatePath(`/audiences/${audienceId}`);
  return { ok: true };
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
