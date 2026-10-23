import { connectToDatabase } from "@/lib/db/connect";
import { Webhook, WebhookDelivery, Workspace } from "@/lib/db/models";
import { hmacSha256 } from "@/lib/crypto";
import { assertPublicUrl } from "@/lib/net";
import { prefixedId } from "@/lib/ids";

/** Retry schedule after a failed attempt: 30s, 2m, 10m, 1h, 6h (6 attempts total). */
const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000, 21_600_000];
export const MAX_WEBHOOK_ATTEMPTS = BACKOFF_MS.length + 1;

/**
 * Emit an event to every enabled webhook in a workspace that subscribes to it.
 * Creates one durable delivery per endpoint and attempts it right away;
 * failures are retried with backoff by the webhook queue.
 *
 * Signatures (both sent):
 *   X-StackEmails-Signature:    sha256=<hmac(rawBody)>                 (v1)
 *   X-StackEmails-Signature-V2: t=<unix>,v1=<hmac(`${t}.${rawBody}`)>  (replay-safe)
 */
export async function emitEvent(workspaceId: string, eventType: string, data: Record<string, unknown>): Promise<void> {
  await connectToDatabase();
  const webhooks = await Webhook.find({ workspaceId, enabled: true }).select("_id events").lean();
  const targets = webhooks.filter((w) => w.events.length === 0 || w.events.includes(eventType));
  if (targets.length === 0) return;

  const eventId = prefixedId("evt");
  const payload = { id: eventId, type: eventType, created_at: new Date().toISOString(), data };
  const deliveries = await WebhookDelivery.insertMany(
    targets.map((w) => ({ workspaceId, webhookId: w._id, eventId, eventType, payload, status: "pending", attempts: 0 })),
  );
  const { getWebhookQueue } = await import("@/lib/queue/webhooks");
  await Promise.all(deliveries.map((d) => getWebhookQueue().enqueue(String(d._id), 0)));
}

/** Perform one delivery attempt. Returns true when finished (success or final failure). */
export async function attemptDelivery(deliveryId: string): Promise<boolean> {
  await connectToDatabase();
  const delivery = await WebhookDelivery.findById(deliveryId);
  if (!delivery || delivery.status === "success" || delivery.status === "failed") return true;
  const [webhook, workspace] = await Promise.all([Webhook.findById(delivery.webhookId), Workspace.findById(delivery.workspaceId).select("webhookSecret")]);
  if (!webhook || !webhook.enabled || !workspace) {
    delivery.status = "failed";
    delivery.error = !webhook ? "Endpoint was deleted." : "Endpoint is disabled.";
    await delivery.save();
    return true;
  }

  const body = JSON.stringify(delivery.payload);
  const t = Math.floor(Date.now() / 1000);
  const started = Date.now();
  delivery.attempts = (delivery.attempts ?? 0) + 1;
  try {
    const safe = await assertPublicUrl(webhook.url); // re-checked every attempt (DNS rebinding)
    if (!safe.ok) throw new Error(`Blocked: ${safe.reason}`);
    const res = await fetch(safe.url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/json",
        "user-agent": "StackEmails-Webhooks/2.0",
        "x-stackemails-event": delivery.eventType,
        "x-stackemails-event-id": delivery.eventId,
        "x-stackemails-delivery-attempt": String(delivery.attempts),
        "x-stackemails-timestamp": String(t),
        "x-stackemails-signature": `sha256=${hmacSha256(body, workspace.webhookSecret)}`,
        "x-stackemails-signature-v2": `t=${t},v1=${hmacSha256(`${t}.${body}`, workspace.webhookSecret)}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    delivery.responseStatus = res.status;
    delivery.responseBody = (await res.text().catch(() => "")).slice(0, 2000);
    delivery.durationMs = Date.now() - started;
    if (res.ok) {
      delivery.status = "success";
      delivery.error = undefined;
      delivery.nextRetryAt = undefined;
      await delivery.save();
      return true;
    }
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    delivery.durationMs = Date.now() - started;
    delivery.error = err instanceof Error ? err.message : String(err);
    const blocked = delivery.error.startsWith("Blocked:");
    if (blocked || delivery.attempts >= MAX_WEBHOOK_ATTEMPTS) {
      delivery.status = "failed";
      delivery.nextRetryAt = undefined;
      await delivery.save();
      return true;
    }
    const wait = BACKOFF_MS[delivery.attempts - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
    delivery.status = "retrying";
    delivery.nextRetryAt = new Date(Date.now() + wait);
    await delivery.save();
    const { getWebhookQueue } = await import("@/lib/queue/webhooks");
    await getWebhookQueue().enqueue(String(delivery._id), wait);
    return false;
  }
}

/** Manually re-send a delivery (from the dashboard). */
export async function redeliver(deliveryId: string): Promise<void> {
  await WebhookDelivery.updateOne({ _id: deliveryId }, { $set: { status: "pending", attempts: 0 }, $unset: { nextRetryAt: 1 } });
  const { getWebhookQueue } = await import("@/lib/queue/webhooks");
  await getWebhookQueue().enqueue(deliveryId, 0);
}

