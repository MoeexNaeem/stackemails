import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog, Suppression } from "@/lib/db/models";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { apiJson } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Receiver for Amazon SNS notifications carrying SES events
 * (Delivery / Bounce / Complaint / Open / Click). Configure your SES
 * Configuration Set to publish to an SNS topic pointed at this URL.
 *
 * Handles SNS subscription confirmation automatically, then correlates each
 * event back to an EmailLog by SES messageId and re-emits it to the
 * workspace's customer webhooks.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let sns: Record<string, unknown>;
  try {
    sns = JSON.parse(raw);
  } catch {
    return apiJson({ ok: false }, 400);
  }

  // 1. Auto-confirm the SNS subscription on first setup.
  if (sns.Type === "SubscriptionConfirmation" && typeof sns.SubscribeURL === "string") {
    try {
      await fetch(sns.SubscribeURL);
    } catch {
      /* best effort */
    }
    return apiJson({ ok: true, confirmed: true });
  }

  if (sns.Type !== "Notification" || typeof sns.Message !== "string") {
    return apiJson({ ok: true, ignored: true });
  }

  let event: {
    eventType?: string;
    notificationType?: string;
    mail?: { messageId?: string };
  };
  try {
    event = JSON.parse(sns.Message);
  } catch {
    return apiJson({ ok: true, ignored: true });
  }

  const kind = (event.eventType || event.notificationType || "").toLowerCase();
  const awsMessageId = event.mail?.messageId;
  if (!awsMessageId) return apiJson({ ok: true, ignored: true });

  await connectToDatabase();
  const log = await EmailLog.findOne({ awsMessageId });
  if (!log) return apiJson({ ok: true, unmatched: true });

  const map: Record<string, { status: string; event: string }> = {
    delivery: { status: "delivered", event: "email.delivered" },
    bounce: { status: "bounced", event: "email.bounced" },
    complaint: { status: "complained", event: "email.complained" },
    open: { status: log.status, event: "email.opened" },
    click: { status: log.status, event: "email.clicked" },
  };
  const mapped = map[kind];
  if (!mapped) return apiJson({ ok: true, ignored: true });

  if (mapped.status !== log.status) log.status = mapped.status as typeof log.status;
  if (kind === "delivery") log.deliveredAt = new Date();
  log.events.push({ type: kind as never, at: new Date() });
  await log.save();

  // Suppress recipients that hard-bounce or complain, to protect reputation.
  if (kind === "bounce" || kind === "complaint") {
    await Promise.all(
      log.to.map((email) =>
        Suppression.updateOne(
          { workspaceId: log.workspaceId, email },
          { $setOnInsert: { reason: kind === "bounce" ? "bounce" : "complaint" } },
          { upsert: true },
        ).catch(() => {}),
      ),
    );
  }

  await emitEvent(String(log.workspaceId), mapped.event, {
    email_id: log.messageId,
    to: log.to,
    status: log.status,
  });

  return apiJson({ ok: true });
}
