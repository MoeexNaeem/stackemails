import { apiError, apiJson } from "@/lib/api/response";
import { resetPasswordSchema } from "@/lib/validation/schemas";
import { getRateLimiter } from "@/lib/ratelimit";
import { resetPassword } from "@/lib/auth/passwordReset";
import { createSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await getRateLimiter().check(`pwreset:consume:${ip}`, 10, 15 * 60_000);
  if (!rl.allowed) {
    return apiError(429, "rate_limited", "Too many attempts. Please wait a few minutes and try again.");
  }

  const result = await resetPassword(parsed.data.token, parsed.data.password);
  if (!result.ok) return apiError(400, "invalid_token", result.message);

  // All old sessions were revoked; sign the user in on this device.
  await createSession(result.userId, req.headers.get("user-agent") ?? undefined);
  return apiJson({ ok: true });
}
