"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog, InboundEmail, Inbox, Suppression } from "@/lib/db/models";
import { normalizeEmail } from "@/lib/contacts";
import { buildTestMime, ingestInbound, receivingDomain } from "@/lib/inbound";

export type EmailsState = { ok: boolean; error?: string; message?: string };

async function ctx() {
  const c = await requireDashboardContext();
  await connectToDatabase();
  return c;
}

export async function addSuppressionAction(_prev: EmailsState, formData: FormData): Promise<EmailsState> {
  const { workspace } = await ctx();
  const emails = String(formData.get("emails") ?? "")
    .split(/[\s,;]+/)
    .map((e) => normalizeEmail(e))
    .filter((e): e is string => !!e);
  if (!emails.length) return { ok: false, error: "Enter at least one valid email address." };
  await Promise.all(emails.slice(0, 1000).map((email) => Suppression.updateOne({ workspaceId: workspace._id, email }, { $setOnInsert: { reason: "manual" } }, { upsert: true })));
  revalidatePath("/emails/suppressions");
  return { ok: true, message: `Suppressed ${emails.length} address${emails.length === 1 ? "" : "es"}.` };
}

export async function removeSuppressionAction(id: string): Promise<void> {
  const { workspace } = await ctx();
  if (!isValidObjectId(id)) return;
  await Suppression.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/emails/suppressions");
}

/** Deliver a sample message to the team's receiving address (or an inbox) through the real inbound pipeline. */
export async function sendTestInboundAction(inboxId?: string): Promise<EmailsState> {
  const { workspace, user } = await ctx();
  let to = `hello@${await receivingDomain(workspace)}`;
  if (inboxId && isValidObjectId(inboxId)) {
    const inbox = await Inbox.findOne({ _id: inboxId, workspaceId: workspace._id }).lean();
    if (!inbox) return { ok: false, error: "Inbox not found." };
    to = inbox.alias || inbox.address;
  }
  const stored = await ingestInbound(
    buildTestMime({
      from: `${user.name} <${user.email}>`,
      to,
      subject: "Test email from Stack Emails",
      text: `Hi! This is a test message delivered to ${to} to check that receiving works.\n\nReply to this thread from your inbox to try sending.`,
    }),
    [to],
  );
  revalidatePath("/emails/receiving");
  revalidatePath("/inboxes", "layout");
  return stored.length ? { ok: true, message: `Delivered a test email to ${to}.` } : { ok: false, error: "The test email couldn't be routed." };
}

export async function markInboundReadAction(id: string): Promise<void> {
  const { workspace } = await ctx();
  const e = await InboundEmail.findOneAndUpdate({ workspaceId: workspace._id, messageId: id, read: false }, { $set: { read: true } });
  if (e?.inboxId) await Inbox.updateOne({ _id: e.inboxId, unread: { $gt: 0 } }, { $inc: { unread: -1 } });
}

export async function cancelScheduledEmailAction(messageId: string): Promise<EmailsState> {
  const { workspace } = await ctx();
  const log = await EmailLog.findOneAndUpdate(
    { workspaceId: workspace._id, messageId, status: "scheduled" },
    { $set: { status: "canceled" }, $unset: { attachmentBlobs: 1 }, $push: { events: { type: "canceled", at: new Date() } } },
  );
  revalidatePath(`/emails/${messageId}`);
  revalidatePath("/emails");
  return log ? { ok: true, message: "Scheduled email canceled." } : { ok: false, error: "Only scheduled emails can be canceled." };
}
