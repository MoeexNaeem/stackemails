import { connectToDatabase } from "@/lib/db/connect";
import { Broadcast, EmailLog, Suppression } from "@/lib/db/models";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { apiJson } from "@/lib/api/response";
import { confirmSubscription, verifySnsMessage } from "@/lib/aws/sns";
import { refreshBroadcastStats } from "@/lib/broadcast";
import { bumpStat } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SesEvent = {
  eventType?: string;
  notificationType?: string;
  mail?: { messageId?: string };
  bounce?: { bounceType?: string; bounceSubType?: string; bouncedRecipients?: { emailAddress: string; diagnosticCode?: string }[] };
  complaint?: { complainedRecipients?: { emailAddress: string }[]; complaintFeedbackType?: string };
  delivery?: { recipients?: string[] };
  deliveryDelay?: { delayType?: string };
  reject?: { reason?: string };
  failure?: { errorMessage?: string };
};

/**
 * Receiver for Amazon SNS notifications carrying SES events (Delivery,
 * Bounce, Complaint, DeliveryDelay, Reject, Rendering Failure, Open, Click).
 * Point your SES configuration set's SNS destination at this URL.
 *
 * Every message's SNS signature is verified first; unsigned or forged posts
 * are rejected, so nobody can fake bounces to suppress your recipients.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const verified = await verifySnsMessage(raw);
  if (!verified.ok) {
    console.warn(`[ses-webhook] rejected: ${verified.reason}`);
    return apiJson({ ok: false, error: "invalid_signature" }, 403);
  }
  const sns = verified.message;

  if (sns.Type === "SubscriptionConfirmation") {
    const confirmed = await confirmSubscription(sns);
    return apiJson({ ok: confirmed, confirmed });
  }
  if (sns.Type !== "Notification") return apiJson({ ok: true, ignored: true });

  let event: SesEvent;
  try {
    event = JSON.parse(sns.Message);
  } catch {
    return apiJson({ ok: true, ignored: true });
  }

  const kind = (event.eventType || event.notificationType || "").toLowerCase().replace(/\s+/g, "");
  const awsMessageId = event.mail?.messageId;
  if (!awsMessageId) return apiJson({ ok: true, ignored: true });

  await connectToDatabase();
  const log = await EmailLog.findOne({ awsMessageId });
  if (!log) return apiJson({ ok: true, unmatched: true });
  const ws = String(log.workspaceId);
  const base = { email_id: log.messageId, to: log.to, from: log.from, subject: log.subject };

  switch (kind) {
    case "delivery": {
      if (!["bounced", "complained"].includes(log.status)) log.status = "delivered";
      log.deliveredAt = new Date();
      log.events.push({ type: "delivered", at: new Date() });
      await log.save();
      await bumpStat(log.workspaceId, log.from, { delivered: 1 });
      await emitEvent(ws, "email.delivered", { ...base, status: "delivered" });
      break;
    }
    case "bounce": {
      const type = event.bounce?.bounceType ?? "Undetermined"; // Permanent | Transient | Undetermined
      const recipients = (event.bounce?.bouncedRecipients ?? []).map((r) => r.emailAddress.toLowerCase());
      log.status = "bounced";
      log.bounceType = type;
      await bumpStat(log.workspaceId, log.from, { bounced: 1, ...(type === "Permanent" ? { bouncePermanent: 1 } : type === "Transient" ? { bounceTransient: 1 } : {}) });
      log.events.push({ type: "bounced", at: new Date(), detail: `${type}${event.bounce?.bounceSubType ? ` / ${event.bounce.bounceSubType}` : ""}: ${recipients.join(", ")}` });
      await log.save();
      // Only hard (permanent) bounces are suppressed; soft bounces may recover.
      if (type === "Permanent") {
        await Promise.all(recipients.map((email) => Suppression.updateOne({ workspaceId: log.workspaceId, email }, { $setOnInsert: { reason: "bounce" } }, { upsert: true })));
      }
      await emitEvent(ws, "email.bounced", { ...base, status: "bounced", bounce: { type, sub_type: event.bounce?.bounceSubType ?? null, recipients } });
      break;
    }
    case "complaint": {
      const recipients = (event.complaint?.complainedRecipients ?? []).map((r) => r.emailAddress.toLowerCase());
      log.status = "complained";
      await bumpStat(log.workspaceId, log.from, { complained: 1 });
      log.events.push({ type: "complained", at: new Date(), detail: recipients.join(", ") });
      await log.save();
      await Promise.all(recipients.map((email) => Suppression.updateOne({ workspaceId: log.workspaceId, email }, { $set: { reason: "complaint" } }, { upsert: true })));
      await emitEvent(ws, "email.complained", { ...base, status: "complained", recipients });
      break;
    }
    case "deliverydelay": {
      log.events.push({ type: "delivery_delayed", at: new Date(), detail: event.deliveryDelay?.delayType });
      if (log.status === "sent") log.status = "delivery_delayed";
      await log.save();
      await emitEvent(ws, "email.delivery_delayed", { ...base, status: log.status });
      break;
    }
    case "reject":
    case "renderingfailure": {
      const detail = event.reject?.reason ?? event.failure?.errorMessage ?? kind;
      log.status = "failed";
      log.errorMessage = detail;
      await bumpStat(log.workspaceId, log.from, { failed: 1 });
      log.events.push({ type: "failed", at: new Date(), detail });
      await log.save();
      await emitEvent(ws, "email.failed", { ...base, status: "failed", error: detail });
      break;
    }
    case "open": {
      const first = (log.opens ?? 0) === 0;
      log.opens = (log.opens ?? 0) + 1;
      if (first) {
        await bumpStat(log.workspaceId, log.from, { opened: 1 });
        log.openedAt = new Date();
        log.events.push({ type: "opened", at: new Date() });
      }
      await log.save();
      if (first) await emitEvent(ws, "email.opened", base);
      break;
    }
    case "click": {
      const first = (log.clicks ?? 0) === 0;
      log.clicks = (log.clicks ?? 0) + 1;
      if (first) {
        await bumpStat(log.workspaceId, log.from, { clicked: 1 });
        log.clickedAt = new Date();
        log.events.push({ type: "clicked", at: new Date() });
      }
      await log.save();
      await emitEvent(ws, "email.clicked", base);
      break;
    }
    default:
      return apiJson({ ok: true, ignored: kind });
  }

  if (log.broadcastId && (await Broadcast.exists({ _id: log.broadcastId }))) {
    refreshBroadcastStats(log.broadcastId).catch(() => {});
  }
  return apiJson({ ok: true });
}
