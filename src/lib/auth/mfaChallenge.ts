import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Short-lived signed token proving the password step passed: "<userId>.<exp>.<sig>". */
export function issueMfaChallenge(userId: string, ttlMs = 5 * 60_000): string {
  const exp = Date.now() + ttlMs;
  const sig = createHmac("sha256", env.sessionSecret).update(`mfa-challenge:${userId}:${exp}`).digest("base64url");
  return `${userId}.${exp}.${sig}`;
}

export function verifyMfaChallenge(token: string): string | null {
  const [userId, expRaw, sig] = String(token ?? "").split(".");
  const exp = Number(expRaw);
  if (!userId || !sig || !Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = createHmac("sha256", env.sessionSecret).update(`mfa-challenge:${userId}:${exp}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}
