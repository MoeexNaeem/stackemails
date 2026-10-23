import { apiError, apiJson } from "@/lib/api/response";
import { loginSchema } from "@/lib/validation/schemas";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { getRateLimiter } from "@/lib/ratelimit";
import { issueMfaChallenge } from "@/lib/auth/mfaChallenge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Unknown emails still pay for one bcrypt comparison, so timing doesn't reveal which accounts exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password"));

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return apiError(422, "validation_error", "Invalid email or password.");
  const { email, password } = parsed.data;

  // Brute-force protection: per IP and per account.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiter = getRateLimiter();
  const [byIp, byEmail] = await Promise.all([limiter.check(`login:ip:${ip}`, 30, 15 * 60_000), limiter.check(`login:email:${email}`, 10, 15 * 60_000)]);
  if (!byIp.allowed || !byEmail.allowed) {
    return apiError(429, "rate_limited", "Too many sign-in attempts. Wait 15 minutes or reset your password.");
  }

  await connectToDatabase();
  const user = await User.findOne({ email });
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) return apiError(401, "invalid_credentials", "Invalid email or password.");
  if (user.disabled) return apiError(403, "account_disabled", "This account has been disabled. Contact support@stackemails.com.");

  if (user.mfaEnabled) {
    return apiJson({ ok: true, mfa_required: true, challenge: issueMfaChallenge(String(user._id)) });
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date(), lastLoginIp: ip } });
  await createSession(String(user._id), req.headers.get("user-agent") ?? undefined);
  return apiJson({ ok: true, redirect: user.platformRole === "admin" ? "/admin" : "/overview" });
}
