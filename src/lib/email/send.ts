import type { Types } from "mongoose";
import { EmailLog, type EmailLogDoc, type WorkspaceDoc } from "@/lib/db/models";
import { prefixedId } from "@/lib/ids";
import { getEmailQueue } from "@/lib/queue";
import { sentThisPeriod, sentToday } from "@/lib/quota";
import { assertSenderAllowed } from "@/lib/email/guards";
import { bumpStat } from "@/lib/stats";

export type SendInput = {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string> | { name: string; value: string }[];
  /** Base64 strings (API) or Buffers (SMTP / internal). */
  attachments?: { filename: string; content: string | Buffer; contentType?: string }[];
  tags?: { name: string; value: string }[];
  scheduledAt?: Date | null;
  idempotencyKey?: string;
  source: "api" | "dashboard" | "broadcast" | "automation" | "smtp" | "inbox";
  apiKeyId?: Types.ObjectId | string;
  broadcastId?: Types.ObjectId | string;
  contactId?: Types.ObjectId | string;
  /** Skip quota + sender checks (broadcast fan-out verifies both once up front; the worker re-checks the sender). */
  prechecked?: boolean;
};

export type SendResult =
  | { ok: true; email: Pick<EmailLogDoc, "messageId" | "status" | "scheduledAt">; duplicate?: boolean }
  | { ok: false; status: number; code: string; message: string };

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB total per email
const MAX_RECIPIENTS = 50;
const MAX_SCHEDULE_MS = 30 * 86_400_000;
// Headers callers may not set - they're owned by the provider / DKIM signature.
const RESERVED_HEADERS = /^(from|to|cc|bcc|subject|reply-to|sender|return-path|date|message-id|mime-version|content-type|content-transfer-encoding|dkim-signature|received)$/i;

function fail(status: number, code: string, message: string): SendResult {
  return { ok: false, status, code, message };
}

/**
 * Validate, persist and enqueue one email. This is the single entry point for
 * every send path, so quotas, sender verification, attachment limits, header
 * safety, scheduling and idempotency behave identically everywhere.
 */
export async function createAndQueueEmail(workspace: WorkspaceDoc, input: SendInput): Promise<SendResult> {
  if (workspace.status === "suspended") return fail(403, "account_suspended", "This account has been suspended. Contact support.");
  if (workspace.status === "restricted") return fail(403, "account_restricted", workspace.restrictedReason || "This account is restricted from sending.");

  const total = input.to.length + (input.cc?.length ?? 0) + (input.bcc?.length ?? 0);
  if (input.to.length === 0) return fail(422, "validation_error", "`to` must contain at least one recipient.");
  if (total > MAX_RECIPIENTS) return fail(422, "validation_error", `An email can have at most ${MAX_RECIPIENTS} recipients across to, cc and bcc.`);
  if (!input.html && !input.text) return fail(422, "validation_error", "Provide `html` and/or `text` content.");

  if (!input.prechecked) {
    // Usage is metered per recipient, so a 50-recipient email needs 50 units.
    if (sentThisPeriod(workspace) + total > workspace.monthlyQuota) return fail(429, "quota_exceeded", "Monthly send quota reached for this team.");
    if (sentToday(workspace) + total > workspace.dailyQuota) return fail(429, "quota_exceeded", "Daily send quota reached for this team.");
  }

  if (!input.prechecked) {
    const sender = await assertSenderAllowed(workspace._id, input.from);
    if (!sender.ok) return fail(sender.code === "invalid_from" ? 422 : 403, sender.code, sender.message);
  }

  // Idempotency: same key → same email, no second send.
  if (input.idempotencyKey) {
    const existing = await EmailLog.findOne({ workspaceId: workspace._id, idempotencyKey: input.idempotencyKey }).select("messageId status scheduledAt").lean();
    if (existing) return { ok: true, email: existing, duplicate: true };
  }

  // Headers
  const headerList = Array.isArray(input.headers)
    ? input.headers
    : Object.entries(input.headers ?? {}).map(([name, value]) => ({ name, value: String(value) }));
  for (const h of headerList) {
    if (!/^[\x21-\x39\x3b-\x7e]{1,126}$/.test(h.name)) return fail(422, "validation_error", `Invalid header name: ${h.name}`);
    if (RESERVED_HEADERS.test(h.name)) return fail(422, "validation_error", `The ${h.name} header can't be overridden.`);
    if (/[\r\n]/.test(h.value) || h.value.length > 995) return fail(422, "validation_error", `Invalid value for header ${h.name}.`);
  }

  // Attachments
  let bytes = 0;
  const blobs: { filename: string; contentType: string; data: Buffer }[] = [];
  for (const a of input.attachments ?? []) {
    if (!a.filename || /[\r\n/\\]/.test(a.filename)) return fail(422, "validation_error", "Each attachment needs a valid filename.");
    let data: Buffer;
    if (Buffer.isBuffer(a.content)) data = a.content;
    else {
      if (!/^[A-Za-z0-9+/=\s]*$/.test(a.content)) return fail(422, "validation_error", `Attachment ${a.filename} must be base64-encoded.`);
      data = Buffer.from(a.content, "base64");
    }
    bytes += data.length;
    blobs.push({ filename: a.filename.slice(0, 200), contentType: a.contentType || "application/octet-stream", data });
  }
  if (bytes > MAX_ATTACHMENT_BYTES) return fail(422, "validation_error", "Attachments can total at most 10 MB per email.");

  // Scheduling
  let delayMs = 0;
  if (input.scheduledAt) {
    delayMs = input.scheduledAt.getTime() - Date.now();
    if (Number.isNaN(delayMs)) return fail(422, "validation_error", "`scheduled_at` must be an ISO 8601 date.");
    if (delayMs > MAX_SCHEDULE_MS) return fail(422, "validation_error", "Emails can be scheduled at most 30 days ahead.");
    if (delayMs < 0) delayMs = 0;
  }

  const log = await EmailLog.create({
    workspaceId: workspace._id,
    messageId: prefixedId("msg"),
    from: input.from,
    to: input.to,
    cc: input.cc ?? [],
    bcc: input.bcc ?? [],
    replyTo: input.replyTo ?? [],
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: headerList,
    attachments: blobs.map((b) => ({ filename: b.filename, contentType: b.contentType, size: b.data.length })),
    attachmentBlobs: blobs.length ? blobs : undefined,
    tags: input.tags ?? [],
    status: delayMs > 0 ? "scheduled" : "queued",
    source: input.source,
    apiKeyId: input.apiKeyId,
    broadcastId: input.broadcastId,
    contactId: input.contactId,
    idempotencyKey: input.idempotencyKey,
    scheduledAt: delayMs > 0 ? input.scheduledAt : undefined,
    events: [delayMs > 0 ? { type: "scheduled", at: new Date(), detail: `Scheduled for ${input.scheduledAt!.toISOString()}` } : { type: "queued", at: new Date() }],
  });

  bumpStat(workspace._id, input.from, { total: 1 });
  await getEmailQueue().enqueue({ emailId: String(log._id), workspaceId: String(workspace._id) }, { delayMs });
  return { ok: true, email: { messageId: log.messageId, status: log.status, scheduledAt: log.scheduledAt } };
}
