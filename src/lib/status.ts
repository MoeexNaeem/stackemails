import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { env } from "@/lib/env";

export type ComponentStatus = { name: string; status: "operational" | "degraded" | "down"; detail?: string };

let cache: { at: number; value: ComponentStatus[] } | null = null;

/** Lightweight health checks for the status indicator (cached 60s). */
export async function systemStatus(): Promise<ComponentStatus[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.value;
  const out: ComponentStatus[] = [];

  try {
    await connectToDatabase();
    const t = Date.now();
    await mongoose.connection.db!.admin().ping();
    out.push({ name: "API & dashboard", status: Date.now() - t > 1500 ? "degraded" : "operational" });
  } catch {
    out.push({ name: "API & dashboard", status: "down", detail: "Database unreachable" });
  }

  if (env.queueDriver === "bullmq" || env.rateLimitDriver === "redis") {
    try {
      const { default: Redis } = await import("ioredis");
      const r = new Redis(env.redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 3000, lazyConnect: true });
      await r.connect();
      await r.ping();
      r.disconnect();
      out.push({ name: "Sending queue", status: "operational" });
    } catch {
      out.push({ name: "Sending queue", status: "down", detail: "Queue unreachable" });
    }
  } else {
    out.push({ name: "Sending queue", status: "operational" });
  }

  out.push({ name: "Email delivery (Amazon SES)", status: "operational" });
  cache = { at: Date.now(), value: out };
  return out;
}

export function overall(components: ComponentStatus[]): ComponentStatus["status"] {
  if (components.some((c) => c.status === "down")) return "down";
  if (components.some((c) => c.status === "degraded")) return "degraded";
  return "operational";
}
