import { env } from "@/lib/env";

/** Queue for webhook delivery attempts (separate from email sends). */
export interface WebhookQueue {
  enqueue(deliveryId: string, delayMs: number): Promise<void>;
}

class MemoryWebhookQueue implements WebhookQueue {
  async enqueue(deliveryId: string, delayMs: number) {
    const run = () => import("@/lib/webhooks/dispatch").then((m) => m.attemptDelivery(deliveryId)).catch((e) => console.error("[webhooks] attempt failed", e));
    if (delayMs > 0) setTimeout(run, Math.min(delayMs, 2_147_000_000));
    else queueMicrotask(() => void run());
  }
}

class BullWebhookQueue implements WebhookQueue {
  private q: Promise<import("bullmq").Queue> | null = null;
  private queue() {
    if (!this.q) {
      this.q = (async () => {
        const { Queue } = await import("bullmq");
        const { default: Redis } = await import("ioredis");
        return new Queue("webhook-dispatch-queue", { connection: new Redis(env.redisUrl, { maxRetriesPerRequest: null }) });
      })();
    }
    return this.q;
  }
  async enqueue(deliveryId: string, delayMs: number) {
    const q = await this.queue();
    // Each attempt is its own job; attemptDelivery schedules the next one itself.
    await q.add("deliver", { deliveryId }, { delay: Math.max(0, delayMs), removeOnComplete: 1000, removeOnFail: 5000, attempts: 1 });
  }
}

const g = globalThis as unknown as { __stackemailsWebhookQueue?: WebhookQueue };
export function getWebhookQueue(): WebhookQueue {
  if (!g.__stackemailsWebhookQueue) g.__stackemailsWebhookQueue = env.queueDriver === "bullmq" ? new BullWebhookQueue() : new MemoryWebhookQueue();
  return g.__stackemailsWebhookQueue;
}
