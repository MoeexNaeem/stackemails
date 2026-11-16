import { after } from "next/server";
import { apiError, apiJson } from "@/lib/api/response";
import { signupSchema } from "@/lib/validation/schemas";
import { createAccount } from "@/lib/accounts";
import { createSession } from "@/lib/auth/session";
import { sendVerificationEmail } from "@/lib/auth/emailVerify";
import { isDisposableEmail, watchSignupSurge } from "@/lib/abuse";
import { getRateLimiter } from "@/lib/ratelimit";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { clientIp } from "@/lib/client-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  // Abuse protection: bot check, no throwaway inboxes, and a cap on accounts per IP address.
  const ip = clientIp(req.headers);
  if (!(await verifyTurnstile((body as Record<string, unknown>)?.["cf-turnstile-response"], ip))) {
    return apiError(403, "bot_check_failed", "Please complete the security check and try again.");
  }
  if (isDisposableEmail(parsed.data.email)) {
    return apiError(422, "email_not_allowed", "Please sign up with a permanent work or personal email address.");
  }
  const limiter = getRateLimiter();
  const [hour, day] = await Promise.all([limiter.check(`signup:ip:h:${ip}`, 3, 3600_000), limiter.check(`signup:ip:d:${ip}`, 5, 24 * 3600_000)]);
  if (!hour.allowed || !day.allowed) {
    return apiError(429, "rate_limited", "Too many accounts were created from your network. Try again later or contact support@stackemails.com.");
  }

  try {
    const { userId } = await createAccount(parsed.data);
    await createSession(userId, req.headers.get("user-agent") ?? undefined);

    // One email at signup: the confirmation link. Domains and invites stay locked until it's clicked.
    const { email } = parsed.data;
    after(() => sendVerificationEmail({ _id: userId, email }));
    after(() => watchSignupSurge(ip));

    return apiJson({ ok: true }, 201);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "email_taken") {
      return apiError(409, "email_taken", "An account with that email already exists.");
    }
    console.error("[signup] error", err);
    return apiError(500, "server_error", "Could not create account.");
  }
}
