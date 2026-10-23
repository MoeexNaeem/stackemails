/**
 * Stack Emails queue worker (BullMQ).
 *
 * Only needed when QUEUE_DRIVER=bullmq. In the default in-process mode the API
 * server drains the queue itself and this file isn't used.
 *
 * Run it as a separate process:  npm run worker
 *
 * It consumes the same `email-dispatch-queue` the API writes to, and delegates
 * to the shared `processEmailJob` step so behaviour matches the in-process path
 * exactly (idempotency, guards, retries, provider dispatch, webhook events).
 * When SMTP_PORT is set it also runs the SMTP relay (src/worker/smtp.ts).
 */
import "dotenv/config";
import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { env } from "@/lib/env";
import { processEmailJob, type EmailJob } from "@/lib/email/dispatch";

const connection = new Redis(env.redisUrl, { maxRetriesPerRequest: null });

// SES enforces a per-second send rate: 1/s in the sandbox, 14+/s in production.
const maxPerSecond = Math.max(1, Number(process.env.SES_MAX_SEND_RATE || 1));

const worker = new Worker<EmailJob>(
  "email-dispatch-queue",
  async (job: Job<EmailJob>) => {
    await processEmailJob(job.data, job.attemptsMade + 1);
  },
  {
    connection,
    concurrency: Math.min(50, maxPerSecond * 4),
    limiter: { max: maxPerSecond, duration: 1000 },
  },
);

// Webhook deliveries (retries are scheduled by attemptDelivery itself).
const webhookWorker = new Worker<{ deliveryId: string }>(
  "webhook-dispatch-queue",
  async (job) => {
    const { attemptDelivery } = await import("@/lib/webhooks/dispatch");
    await attemptDelivery(job.data.deliveryId);
  },
  { connection, concurrency: 20 },
);
webhookWorker.on("failed", (job, err) => console.error(`[worker] webhook job ${job?.id} errored: ${err.message}`));

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} dispatched email ${job.data.emailId}`);
});
worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} attempt ${job?.attemptsMade} failed: ${err.message}`);
});

console.log(`Stack Emails worker polling Redis (max ${maxPerSecond} sends/sec)…`);

// Background domain verification: re-check pending domains for 72h after they're added.
async function recheckPendingDomains() {
  const { connectToDatabase } = await import("@/lib/db/connect");
  const { Domain } = await import("@/lib/db/models");
  const { verifyDomain } = await import("@/lib/domains");
  await connectToDatabase();
  const since = new Date(Date.now() - 72 * 3600_000);
  const pending = await Domain.find({ status: "pending", createdAt: { $gte: since } }).limit(100);
  for (const d of pending) {
    try {
      const { changed } = await verifyDomain(d);
      if (changed) console.log(`[worker] domain ${d.name} verified`);
    } catch (err) {
      console.error(`[worker] domain check ${d.name} failed:`, (err as Error).message);
    }
  }
}
setInterval(() => void recheckPendingDomains(), 10 * 60_000);
setTimeout(() => void recheckPendingDomains(), 15_000);

if (process.env.SMTP_PORT) {
  import("./smtp").then((m) => m.startSmtpRelay()).catch((err) => console.error("[smtp] failed to start", err));
}
