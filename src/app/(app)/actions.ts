"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace, roleIn } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { redirect } from "next/navigation";
import { isValidObjectId, type HydratedDocument } from "mongoose";
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
  type BroadcastDoc,
} from "@/lib/db/models";
import { getStarter } from "@/lib/templates/starters";
import { runAutomationsForContact } from "@/lib/automations/run";
import { generateApiKey } from "@/lib/auth/apiKey";
import { getEmailProvider } from "@/lib/email";
import { getEmailQueue } from "@/lib/queue";
import { prefixedId } from "@/lib/ids";
import { buildDnsRecords } from "@/lib/dns";
import { assertSenderAllowed, checkDomainAvailable } from "@/lib/email/guards";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { renderEmail, WelcomeEmail } from "@/emails";
import { sendBroadcast } from "@/lib/broadcast";
import { createAndQueueEmail } from "@/lib/email/send";
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

/** Billing/team settings are limited to owners and admins. */
async function requireManager(): Promise<WorkspaceDoc | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const workspace = await getActiveWorkspace(user);
  if (!workspace) return null;
  await connectToDatabase();
  const role = await roleIn(user._id, workspace._id);
  return role === "owner" || role === "admin" ? workspace : null;
}

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

  await connectToDatabase();
  const res = await createAndQueueEmail(workspace, {
    from: parsed.data.from,
    to: parsed.data.to,
    subject: parsed.data.subject,
    html: parsed.data.html,
    text: parsed.data.text,
    source: "dashboard",
  });
  if (!res.ok) return { ok: false, error: res.message };
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

  // Render the React Email component to HTML on the server, then queue it.
  const html = await renderEmail(createElement(WelcomeEmail, { name: to.split("@")[0], product: workspace.name }));
  await connectToDatabase();
  const res = await createAndQueueEmail(workspace, { from, to: [to], subject: `Welcome to ${workspace.name}`, html, source: "dashboard" });
  if (!res.ok) return { ok: false, error: res.message };
  revalidatePath("/emails");
  return { ok: true };
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

/** Apply the editor form to a broadcast document (shared by save + send). */
function applyBroadcastForm(bc: HydratedDocument<BroadcastDoc>, formData: FormData) {
  bc.name = String(formData.get("name") || "Untitled").slice(0, 120);
  bc.from = String(formData.get("from") || "").slice(0, 320);
  bc.replyTo = String(formData.get("replyTo") || "").slice(0, 320);
  bc.subject = String(formData.get("subject") || "").slice(0, 998);
  bc.previewText = String(formData.get("previewText") || "").slice(0, 200);
  bc.html = String(formData.get("html") || "");
  bc.design = String(formData.get("design") || "");
  const audienceId = String(formData.get("audienceId") || "");
  bc.audienceId = audienceId && isValidObjectId(audienceId) ? (audienceId as unknown as typeof bc.audienceId) : undefined;
  const topicId = String(formData.get("topicId") || "");
  bc.topicId = topicId && isValidObjectId(topicId) ? (topicId as unknown as typeof bc.topicId) : undefined;
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
  if (bc.status !== "draft") return { ok: false, error: "Sent broadcasts can't be edited." };
  applyBroadcastForm(bc, formData);
  await bc.save();
  revalidatePath("/broadcasts");
  revalidatePath(`/broadcasts/${id}`);
  return { ok: true };
}

/** Saves the current editor state, then sends now or at the chosen time. */
export async function sendBroadcastEntityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  await connectToDatabase();
  const bc = await Broadcast.findOne({ _id: id, workspaceId: workspace._id });
  if (!bc) return { ok: false, error: "Broadcast not found." };
  if (bc.status !== "draft") return { ok: false, error: `This broadcast is already ${bc.status}.` };
  applyBroadcastForm(bc, formData);

  const when = String(formData.get("scheduledAt") ?? "");
  if (formData.get("mode") === "schedule") {
    const d = new Date(when);
    if (!when || Number.isNaN(d.getTime()) || d.getTime() < Date.now() + 60_000) return { ok: false, error: "Pick a time at least a minute in the future." };
    if (d.getTime() - Date.now() > 30 * 86_400_000) return { ok: false, error: "Broadcasts can be scheduled at most 30 days ahead." };
    bc.scheduledAt = d;
  } else bc.scheduledAt = undefined;
  await bc.save();

  const res = await sendBroadcast(bc);
  revalidatePath("/broadcasts");
  revalidatePath(`/broadcasts/${id}`);
  revalidatePath("/emails");
  if (!res.ok) return { ok: false, error: res.error };
  if (res.queued === 0) return { ok: false, error: "No subscribed contacts in that segment (or all opted out of the topic)." };
  return { ok: true, error: undefined, secret: bc.scheduledAt ? `Scheduled ${res.queued} emails.` : `Sending to ${res.queued} contacts.` };
}

/** Send a one-off preview of the current editor content to the signed-in user. */
export async function sendBroadcastTestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireWorkspace();
  const user = await getCurrentUser();
  await connectToDatabase();
  const html = String(formData.get("html") || "");
  const from = String(formData.get("from") || "");
  const subject = String(formData.get("subject") || "");
  if (!from || !subject || !html) return { ok: false, error: "Add a from address, subject and content first." };
  const to = String(formData.get("testTo") || user?.email || "");
  const res = await createAndQueueEmail(workspace, { from, to: [to], subject: `[Test] ${subject}`, html, source: "dashboard" });
  return res.ok ? { ok: true, secret: `Test sent to ${to}.` } : { ok: false, error: res.message };
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
// ── Settings: Team ────────────────────────────────────────
// ── Settings: Billing ─────────────────────────────────────
export async function updateBillingAddressAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const workspace = await requireManager();
  if (!workspace) return { ok: false, error: "Only team owners and admins can change billing details." };
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
  const workspace = await requireManager();
  if (!workspace) return { ok: false, error: "Only team owners and admins can change billing details." };
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
// ── Webhooks ──────────────────────────────────────────────
