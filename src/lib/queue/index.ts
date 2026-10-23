import { env } from "@/lib/env";
import { MAX_ATTEMPTS, processEmailJob, type EmailJob } from "@/lib/email/dispatch";

export interface EmailQueue {
  readonly driver: string;
  /** Enqueue a send. `delayMs` schedules it for later (scheduled sends). */
  enqueue(job: EmailJob, opts?: { delayMs?: number; jobKey?: string }): Promise<void>;
}

/**
 * In-process queue. Enqueue schedules the job on the event loop and returns
 * immediately, keeping the API response fast. Mirrors BullMQ semantics with
 * exponential-backoff retries. Delayed jobs live in memory, so they don't
 * survive a restart — use BullMQ in production.
 */
class MemoryQueue implements EmailQueue {
  readonly driver = "memory";

  async enqueue(job: EmailJob, opts?: { delayMs?: number }): Promise<void> {
    const delay = Math.max(0, opts?.delayMs ?? 0);
    if (delay > 0) setTimeout(() => void this.run(job, 1), Math.min(delay, 2_147_000_000));
    else queueMicrotask(() => void this.run(job, 1));
  }

  private async run(job: EmailJob, attempt: number): Promise<void> {
    try {
      await processEmailJob(job, attempt);
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        const delay = 2 ** (attempt - 1) * 1000; // 1s, 2s, 4s
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

  async enqueue(job: EmailJob, opts?: { delayMs?: number; jobKey?: string }): Promise<void> {
    const q = await this.queue();
    await q.add("send", job, {
      // De-duplicates double enqueues of the same email; a reschedule passes a new key.
      jobId: opts?.jobKey ? `${job.emailId}-${opts.jobKey}` : job.emailId,
      delay: Math.max(0, opts?.delayMs ?? 0),
      attempts: MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}

const globalForQueue = globalThis as unknown as { __stackemailsQueue?: EmailQueue };

export function getEmailQueue(): EmailQueue {
  if (!globalForQueue.__stackemailsQueue) {
    globalForQueue.__stackemailsQueue =
      env.queueDriver === "bullmq" ? new BullQueue() : new MemoryQueue();
  }
  return globalForQueue.__stackemailsQueue;
}
