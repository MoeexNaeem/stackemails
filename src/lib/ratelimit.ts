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

/**
 * Uses Redis, but never lets a Redis outage (or an exhausted plan quota) break
 * sign-in or the API: on error it falls back to per-process memory limits.
 */
class ResilientLimiter implements Limiter {
  private redis = new RedisLimiter();
  private memory = new MemoryLimiter();
  private lastWarn = 0;

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    try {
      return await this.redis.check(key, limit, windowMs);
    } catch (err) {
      if (Date.now() - this.lastWarn > 60_000) {
        this.lastWarn = Date.now();
        console.error(`[ratelimit] Redis unavailable, using in-memory limits: ${(err as Error).message}`);
      }
      return this.memory.check(key, limit, windowMs);
    }
  }
}

let limiter: Limiter | null = null;

export function getRateLimiter(): Limiter {
  if (!limiter) {
    limiter = env.rateLimitDriver === "redis" ? new ResilientLimiter() : new MemoryLimiter();
  }
  return limiter;
}
