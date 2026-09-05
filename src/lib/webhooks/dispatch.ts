import { connectToDatabase } from "@/lib/db/connect";
import { Webhook, WebhookDelivery, Workspace } from "@/lib/db/models";
import { hmacSha256 } from "@/lib/crypto";

/**
 * Emit an event to every enabled webhook in a workspace that subscribes to it.
 * Each payload is signed with the workspace secret so customers can verify
 * origin:   X-NanoSend-Signature: sha256=<hmac(rawBody, workspaceSecret)>
 */
export async function emitEvent(
  workspaceId: string,
  eventType: string,
  data: Record<string, unknown>,
): Promise<void> {
  await connectToDatabase();

  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return;

  const webhooks = await Webhook.find({ workspaceId, enabled: true });
  const targets = webhooks.filter(
    (w) => w.events.length === 0 || w.events.includes(eventType),
  );
  if (targets.length === 0) return;

  const body = JSON.stringify({
    type: eventType,
    created_at: new Date().toISOString(),
    data,
  });
  const signature = `sha256=${hmacSha256(body, workspace.webhookSecret)}`;

  await Promise.all(
    targets.map(async (wh) => {
      const started = Date.now();
      try {
        const res = await fetch(wh.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": "NanoSend-Webhooks/1.0",
            "x-nanosend-signature": signature,
            "x-nanosend-event": eventType,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        await WebhookDelivery.create({
          workspaceId,
          webhookId: wh._id,
          eventType,
          payload: JSON.parse(body),
          status: res.ok ? "success" : "failed",
          responseStatus: res.status,
          durationMs: Date.now() - started,
        });
      } catch (err) {
        await WebhookDelivery.create({
          workspaceId,
          webhookId: wh._id,
          eventType,
          payload: JSON.parse(body),
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - started,
        });
      }
    }),
  );
}
