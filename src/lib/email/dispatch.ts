import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog, Workspace } from "@/lib/db/models";
import { getEmailProvider } from "@/lib/email";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { env } from "@/lib/env";

export interface EmailJob {
  emailId: string; // EmailLog _id
  workspaceId: string;
}

/**
 * The core worker step: take a queued EmailLog, dispatch it via the configured
 * provider, persist the result, and emit webhook events. Shared by both the
 * in-process queue and the standalone BullMQ worker.
 *
 * Throwing signals the queue to retry (exponential backoff).
 */
export async function processEmailJob(job: EmailJob): Promise<void> {
  await connectToDatabase();
  const log = await EmailLog.findById(job.emailId);
  if (!log) return; // nothing to do
  if (log.status !== "queued") return; // idempotency: already processed

  try {
    const provider = getEmailProvider();
    const result = await provider.send({
      from: log.from,
      to: log.to,
      cc: log.cc,
      bcc: log.bcc,
      replyTo: log.replyTo,
      subject: log.subject,
      html: log.html ?? undefined,
      text: log.text ?? undefined,
      tags: [{ name: "nanosend_email_id", value: String(log._id) }],
    });

    log.status = "sent";
    log.awsMessageId = result.providerMessageId;
    log.sentAt = new Date();
    log.events.push({ type: "sent", at: new Date() });
    await log.save();

    await Workspace.updateOne({ _id: job.workspaceId }, { $inc: { "usage.sent": 1 } });
    await emitEvent(job.workspaceId, "email.sent", serialize(log));

    // In mock mode there's no SNS callback, so simulate a delivery event so the
    // full lifecycle is observable end-to-end.
    if (env.emailProvider === "mock") {
      log.status = "delivered";
      log.deliveredAt = new Date();
      log.events.push({ type: "delivered", at: new Date(), detail: "simulated" });
      await log.save();
      await emitEvent(job.workspaceId, "email.delivered", serialize(log));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    log.status = "failed";
    log.errorMessage = message;
    log.events.push({ type: "failed", at: new Date(), detail: message });
    await log.save();
    await emitEvent(job.workspaceId, "email.failed", { ...serialize(log), error: message });
    throw new Error(`Email dispatch failed: ${message}`);
  }
}

function serialize(log: {
  messageId: string;
  to: string[];
  from: string;
  subject: string;
  status: string;
}) {
  return {
    email_id: log.messageId,
    to: log.to,
    from: log.from,
    subject: log.subject,
    status: log.status,
  };
}
