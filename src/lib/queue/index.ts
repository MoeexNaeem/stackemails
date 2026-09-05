import { env } from "@/lib/env";
import { processEmailJob, type EmailJob } from "@/lib/email/dispatch";

export interface EmailQueue {
  readonly driver: string;
  enqueue(job: EmailJob): Promise<void>;
}

/**
 * In-process queue. Enqueue schedules the job on the event loop and returns
 * immediately, keeping the API response sub-50ms (PRD §4). Includes a small
 * retry with backoff to mirror BullMQ semantics.
 */
class MemoryQueue implements EmailQueue {
  readonly driver = "memory";

  async enqueue(job: EmailJob): Promise<void> {
    queueMicrotask(() => void this.run(job, 0));
  }

  private async run(job: EmailJob, attempt: number): Promise<void> {
    try {
      await processEmailJob(job);
    } catch (err) {
      if (attempt < 3) {
        const delay = 2 ** attempt * 1000; // 1s, 2s, 4s
        setTimeout(() => void this.run(job, attempt + 1), delay);
      } else {
        console.error(`[queue:memory] job ${job.emailId} failed after retries:`, err);
      }
    }
  }
}

/**
 * BullMQ queue. Only the producer lives here — jobs are consumed by the
 * standalone worker (`npm run worker`, see src/worker/index.ts).
 */
class BullQueue implements EmailQueue {
  readonly driver = "bullmq";
  private queuePromise: Promise<import("bullmq").Queue> | null = null;

  private async queue() {
    if (!this.queuePromise) {
      this.queuePromise = (async () => {
        const { Queue } = await import("bullmq");
        const { default: Redis } = await import("ioredis");
        const connection = new Redis(env.redisUrl, { maxRetriesPerRequest: null });
        return new Queue("email-dispatch-queue", { connection });
      })();
    }
    return this.queuePromise;
  }

  async enqueue(job: EmailJob): Promise<void> {
    const q = await this.queue();
    await q.add("send", job, {
      attempts: 4,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}

const globalForQueue = globalThis as unknown as { __nanosendQueue?: EmailQueue };

export function getEmailQueue(): EmailQueue {
  if (!globalForQueue.__nanosendQueue) {
    globalForQueue.__nanosendQueue =
      env.queueDriver === "bullmq" ? new BullQueue() : new MemoryQueue();
  }
  return globalForQueue.__nanosendQueue;
}
