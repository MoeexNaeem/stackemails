import { randomBytes } from "node:crypto";
import { sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";

/**
 * API key format:  ns_<mode>_<32 random bytes as hex>
 * e.g.  ns_live_5f3c...   (72 chars total)
 *
 * We never store the raw key — only sha256(secret + rawKey). The salt is the
 * app SESSION_SECRET so a leaked DB alone can't be brute-forced offline
 * without it.
 */
export function generateApiKey(mode: "live" | "test" = "live"): {
  raw: string;
  keyHash: string;
  last4: string;
} {
  const raw = `ns_${mode}_${randomBytes(32).toString("hex")}`;
  return {
    raw,
    keyHash: hashApiKey(raw),
    last4: raw.slice(-4),
  };
}

export function hashApiKey(rawKey: string): string {
  return sha256(`${env.sessionSecret}:${rawKey}`);
}

/** Extract a bearer token from an Authorization header value. */
export function parseBearer(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const m = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return m ? m[1].trim() : null;
}
