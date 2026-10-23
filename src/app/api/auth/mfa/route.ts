import { z } from "zod";
import { apiError, apiJson } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models";
import { createSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/ratelimit";
import { verifyMfaChallenge } from "@/lib/auth/mfaChallenge";
import { decryptSecret, hashRecovery, verifyTotp } from "@/lib/auth/totp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ challenge: z.string().min(10), code: z.string().trim().min(6).max(20) });

/** Second sign-in step: a 6-digit TOTP code or a one-time recovery code. */
export async function POST(req: Request) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return apiError(422, "validation_error", "Enter the 6-digit code from your authenticator app.");
  }
  const userId = verifyMfaChallenge(body.challenge);
  if (!userId) return apiError(401, "challenge_expired", "Your sign-in session expired. Enter your password again.");

  const rl = await getRateLimiter().check(`mfa:${userId}`, 8, 10 * 60_000);
  if (!rl.allowed) return apiError(429, "rate_limited", "Too many attempts. Wait 10 minutes and try again.");

  await connectToDatabase();
  const user = await User.findById(userId).select("+mfaSecret +mfaLastCounter +mfaRecoveryHashes");
  if (!user || !user.mfaEnabled || !user.mfaSecret || user.disabled) return apiError(401, "invalid_code", "Invalid code.");

  const code = body.code.replace(/\s/g, "");
  let passed = false;
  if (/^\d{6}$/.test(code)) {
    const counter = verifyTotp(decryptSecret(user.mfaSecret), code, user.mfaLastCounter ?? -1);
    if (counter !== null) {
      user.mfaLastCounter = counter; // block code replay
      passed = true;
    }
  } else {
    const h = hashRecovery(code);
    const idx = (user.mfaRecoveryHashes ?? []).indexOf(h);
    if (idx !== -1) {
      user.mfaRecoveryHashes.splice(idx, 1); // single use
      passed = true;
    }
  }
  if (!passed) return apiError(401, "invalid_code", "That code isn't valid. Check your authenticator app's time and try again.");

  user.lastLoginAt = new Date();
  user.lastLoginIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  await user.save();
  await createSession(String(user._id), req.headers.get("user-agent") ?? undefined);
  return apiJson({ ok: true, redirect: user.platformRole === "admin" ? "/admin" : "/overview", recovery_codes_left: user.mfaRecoveryHashes.length });
}
