import type { HydratedDocument } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain, EmailLog, type EmailLogDoc } from "@/lib/db/models";
import { assertSenderAllowed, partitionSuppressed, senderDomain } from "@/lib/email/guards";
import { getEmailProvider } from "@/lib/email";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { recordSend } from "@/lib/quota";
import { applyTracking } from "@/lib/tracking";
import { bumpStat } from "@/lib/stats";
import { env } from "@/lib/env";

export interface EmailJob {
  emailId: string; // EmailLog _id
  workspaceId: string;
}

export const MAX_ATTEMPTS = 4;

/** Provider errors that will never succeed on retry. */
const PERMANENT_ERRORS = new Set([
  "MessageRejected",
  "MailFromDomainNotVerifiedException",
  "AccountSuspendedException",
  "SendingPausedException",
  "BadRequestException",
  "NotFoundException",
  "InvalidParameterValue",
]);

function isPermanent(err: unknown): boolean {
  const name = (err as { name?: string })?.name ?? "";
  return PERMANENT_ERRORS.has(name);
}

/**
 * The core worker step: take a queued EmailLog, dispatch it via the configured
 * provider, persist the result, and emit webhook events. Shared by both the
 * in-process queue and the standalone BullMQ worker.
 *
 * Transient failures throw (the queue retries with backoff) and leave the
 * email "queued"; the final attempt, or a permanent provider error, marks it
 * "failed" without throwing.
 */
export async function processEmailJob(job: EmailJob, attempt = 1): Promise<void> {
  await connectToDatabase();
  const log = await EmailLog.findById(job.emailId).select("+attachmentBlobs");
  if (!log) return; // nothing to do
  // Idempotency: only queued/scheduled emails are sendable (canceled/sent are final).
  if (log.status !== "queued" && log.status !== "scheduled") return;
  // A reschedule enqueues a newer job; this stale one bows out.
  if (log.scheduledAt && log.scheduledAt.getTime() > Date.now() + 2000) return;

  // Policy checks run here because every send path (API, dashboard, broadcasts,
  // automations, SMTP, inboxes) funnels through this job. Failures are final.
  const sender = await assertSenderAllowed(job.workspaceId, log.from);
  if (!sender.ok) return failPermanently(log, job.workspaceId, sender.message);

  const [to, cc, bcc] = await Promise.all(
    [log.to, log.cc ?? [], log.bcc ?? []].map((list) => partitionSuppressed(job.workspaceId, list)),
  );
  const suppressed = [...to.suppressed, ...cc.suppressed, ...bcc.suppressed];
  if (to.allowed.length === 0) {
    return failPermanently(log, job.workspaceId, `All recipients are on the suppression list: ${suppressed.join(", ")}`);
  }
  if (suppressed.length && attempt === 1) {
    log.events.push({ type: "suppressed", at: new Date(), detail: `Skipped suppressed: ${suppressed.join(", ")}` });
  }

  // Per-domain open/click tracking.
  let html = log.html ?? undefined;
  if (html) {
    const domainName = senderDomain(log.from);
    const domain = domainName
      ? await Domain.findOne({ workspaceId: job.workspaceId, name: domainName }).select("openTracking clickTracking").lean()
      : null;
    if (domain && (domain.openTracking || domain.clickTracking)) {
      html = applyTracking(html, log.messageId, { opens: !!domain.openTracking, clicks: !!domain.clickTracking });
    }
  }

  try {
    const result = await getEmailProvider().send({
      from: log.from,
      to: to.allowed,
      cc: cc.allowed,
      bcc: bcc.allowed,
      replyTo: log.replyTo,
      subject: log.subject,
      html,
      text: log.text ?? undefined,
      headers: log.headers?.map((h) => ({ name: h.name, value: h.value })),
      attachments: (log.attachmentBlobs ?? []).map((a) => ({
        filename: a.filename ?? "attachment",
        contentType: a.contentType ?? undefined,
        content: Buffer.from(a.data as Buffer),
      })),
      tags: [{ name: "stackemails_email_id", value: String(log._id) }, ...(log.tags ?? []).map((t) => ({ name: t.name ?? "", value: t.value ?? "" }))],
    });

    log.status = "sent";
    log.awsMessageId = result.providerMessageId;
    log.sentAt = new Date();
    log.events.push({ type: "sent", at: new Date() });
    log.set("attachmentBlobs", undefined); // free attachment bytes once sent
    await log.save();

    await recordSend(job.workspaceId, (log.to?.length ?? 0) + (log.cc?.length ?? 0) + (log.bcc?.length ?? 0));
    await bumpStat(job.workspaceId, log.from, { sent: 1 });
    await emitEvent(job.workspaceId, "email.sent", serialize(log));

    // In mock mode there's no SNS callback, so simulate a delivery event so the
    // full lifecycle is observable end-to-end.
    if (env.emailProvider === "mock") {
      log.status = "delivered";
      log.deliveredAt = new Date();
      log.events.push({ type: "delivered", at: new Date(), detail: "simulated" });
      await log.save();
      await bumpStat(job.workspaceId, log.from, { delivered: 1 });
      await emitEvent(job.workspaceId, "email.delivered", serialize(log));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown send error";
    if (isPermanent(err) || attempt >= MAX_ATTEMPTS) {
      await failPermanently(log, job.workspaceId, message);
      return;
    }
    // Transient: record the attempt, stay queued, and let the queue retry.
    log.events.push({ type: "queued", at: new Date(), detail: `Attempt ${attempt} failed, retrying: ${message}` });
    await log.save();
    throw new Error(`Email dispatch failed (attempt ${attempt}): ${message}`);
  }
}

/** Mark a job failed without throwing, so the queue doesn't retry it. */
async function failPermanently(log: HydratedDocument<EmailLogDoc>, workspaceId: string, message: string) {
  log.status = "failed";
  log.errorMessage = message;
  log.events.push({ type: "failed", at: new Date(), detail: message });
  log.set("attachmentBlobs", undefined);
  await log.save();
  await bumpStat(workspaceId, log.from, { failed: 1 });
  await emitEvent(workspaceId, "email.failed", { ...serialize(log), error: message });
}

function serialize(log: { messageId: string; to: string[]; from: string; subject: string; status: string }) {
  return {
    email_id: log.messageId,
    to: log.to,
    from: log.from,
    subject: log.subject,
    status: log.status,
  };
}
