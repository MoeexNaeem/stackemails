import { after } from "next/server";
import { apiError, apiJson } from "@/lib/api/response";
import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { getRateLimiter } from "@/lib/ratelimit";
import { requestPasswordReset } from "@/lib/auth/passwordReset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GENERIC_OK = {
  ok: true,
  message: "If an account exists for that email, we've sent a link to reset your password.",
};

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", parsed.error.issues[0]?.message ?? "Invalid email.");
  }
  const { email } = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Throttle by IP (abuse) and by email (inbox flooding).
  const limiter = getRateLimiter();
  const [byIp, byEmail] = await Promise.all([
    limiter.check(`pwreset:ip:${ip}`, 10, 15 * 60_000),
    limiter.check(`pwreset:email:${email}`, 3, 60 * 60_000),
  ]);
  if (!byIp.allowed) {
    return apiError(429, "rate_limited", "Too many requests. Please wait a few minutes and try again.");
  }
  // Over the per-email limit: answer exactly like success so it reveals nothing.
  if (!byEmail.allowed) return apiJson(GENERIC_OK);

  // Run after the response so timing doesn't reveal whether the account exists.
  after(() =>
    requestPasswordReset(email, ip).catch((err) =>
      console.error("[forgot-password] failed", err),
    ),
  );
  return apiJson(GENERIC_OK);
}
