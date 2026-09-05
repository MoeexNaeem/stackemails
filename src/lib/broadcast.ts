import { connectToDatabase } from "@/lib/db/connect";
import { Contact, EmailLog, Workspace } from "@/lib/db/models";
import { prefixedId } from "@/lib/ids";
import { getEmailQueue } from "@/lib/queue";
import type { Types } from "mongoose";

export interface BroadcastInput {
  workspaceId: Types.ObjectId | string;
  audienceId: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Fan a broadcast out to every subscribed contact in an audience: one queued
 * EmailLog + job per recipient. Respects unsubscribes and the monthly quota.
 * Returns how many were queued.
 */
export async function sendBroadcast(input: BroadcastInput): Promise<{ queued: number }> {
  await connectToDatabase();

  const contacts = await Contact.find({
    workspaceId: input.workspaceId,
    audienceId: input.audienceId,
    unsubscribed: { $ne: true },
  }).lean();

  const workspace = await Workspace.findById(input.workspaceId);
  if (!workspace) return { queued: 0 };
  const remaining = workspace.monthlyQuota - (workspace.usage?.sent ?? 0);
  const recipients = contacts.slice(0, Math.max(0, remaining));

  const queue = getEmailQueue();
  let queued = 0;
  for (const contact of recipients) {
    const log = await EmailLog.create({
      workspaceId: input.workspaceId,
      messageId: prefixedId("msg"),
      from: input.from,
      to: [contact.email],
      subject: input.subject,
      html: input.html,
      text: input.text,
      status: "queued",
      events: [{ type: "queued", at: new Date() }],
    });
    await queue.enqueue({
      emailId: String(log._id),
      workspaceId: String(input.workspaceId),
    });
    queued++;
  }

  return { queued };
}
