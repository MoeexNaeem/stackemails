import { env } from "@/lib/env";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number; // ms until the window fully resets
};

/**
 * Sliding-window rate limiter. Defaults to an in-process implementation so the
 * app needs no Redis. Set RATE_LIMIT_DRIVER=redis to share limits across
 * instances (via a Redis sorted set).
 */
interface Limiter {
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

class MemoryLimiter implements Limiter {
  private hits = new Map<string, number[]>();

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const arr = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    arr.push(now);
    this.hits.set(key, arr);

    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => t <= windowStart)) this.hits.delete(k);
      }
    }

    const remaining = Math.max(0, limit - arr.length);
    return {
      allowed: arr.length <= limit,
      limit,
      remaining,
      resetMs: windowMs,
    };
  }
}

class RedisLimiter implements Limiter {
  // Lazily created shared client.
  private clientPromise: Promise<import("ioredis").Redis> | null = null;

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = import("ioredis").then(({ default: Redis }) => new Redis(env.redisUrl));
    }
    return this.clientPromise;
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const redis = await this.client();
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `rl:${key}`;

    const pipe = redis.multi();
    pipe.zremrangebyscore(redisKey, 0, windowStart);
    pipe.zadd(redisKey, now, `${now}-${Math.random()}`);
    pipe.zcard(redisKey);
    pipe.pexpire(redisKey, windowMs);
    const res = await pipe.exec();
    const count = (res?.[2]?.[1] as number) ?? 0;

    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetMs: windowMs,
    };
  }
}

let limiter: Limiter | null = null;

export function getRateLimiter(): Limiter {
  if (!limiter) {
    limiter = env.rateLimitDriver === "redis" ? new RedisLimiter() : new MemoryLimiter();
  }
  return limiter;
}
