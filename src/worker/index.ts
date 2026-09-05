/**
 * NanoSend queue worker (BullMQ).
 *
 * Only needed when QUEUE_DRIVER=bullmq. In the default in-process mode the API
 * server drains the queue itself and this file isn't used.
 *
 * Run it as a separate process:  npm run worker
 *
 * It consumes the same `email-dispatch-queue` the API writes to, and delegates
 * to the shared `processEmailJob` step so behaviour matches the in-process path
 * exactly (idempotency, provider dispatch, DB logging, webhook events).
 */
import "dotenv/config";
import { Worker, type Job } from "bullmq";
import Redis from "ioredis";
import { env } from "@/lib/env";
import { processEmailJob, type EmailJob } from "@/lib/email/dispatch";

const connection = new Redis(env.redisUrl, { maxRetriesPerRequest: null });

const worker = new Worker<EmailJob>(
  "email-dispatch-queue",
  async (job: Job<EmailJob>) => {
    await processEmailJob(job.data);
  },
  {
    connection,
    concurrency: 50,
    limiter: {
      // Match SES sandbox baseline of 14 emails/sec; raise once out of sandbox.
      max: 14,
      duration: 1000,
    },
  },
);

worker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} dispatched email ${job.data.emailId}`);
});
worker.on("failed", (job, err) => {
  console.error(`[worker] job ${job?.id} failed: ${err.message}`);
});

console.log("NanoSend worker initialised and polling Redis for jobs…");
