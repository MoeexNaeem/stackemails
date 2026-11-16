import { createElement } from "react";
import { after } from "next/server";
import { apiError, apiJson } from "@/lib/api/response";
import { signupSchema } from "@/lib/validation/schemas";
import { createAccount } from "@/lib/accounts";
import { createSession } from "@/lib/auth/session";
import { sendSystemEmail } from "@/lib/email/system";
import { SystemWelcomeEmail } from "@/emails/system";
import { env } from "@/lib/env";
import { isDisposableEmail } from "@/lib/abuse";
import { getRateLimiter } from "@/lib/ratelimit";

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

  // Abuse protection: no throwaway inboxes, and a cap on accounts per IP address.
  if (isDisposableEmail(parsed.data.email)) {
    return apiError(422, "email_not_allowed", "Please sign up with a permanent work or personal email address.");
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limiter = getRateLimiter();
  const [hour, day] = await Promise.all([limiter.check(`signup:ip:h:${ip}`, 3, 3600_000), limiter.check(`signup:ip:d:${ip}`, 5, 24 * 3600_000)]);
  if (!hour.allowed || !day.allowed) {
    return apiError(429, "rate_limited", "Too many accounts were created from your network. Try again later or contact support@stackemails.com.");
  }

  try {
    const { userId } = await createAccount(parsed.data);
    await createSession(userId, req.headers.get("user-agent") ?? undefined);

    const { name, email } = parsed.data;
    after(() =>
      sendSystemEmail({
        kind: "welcome",
        to: email,
        subject: "Welcome to Stack Emails",
        react: createElement(SystemWelcomeEmail, { name, dashboardUrl: `${env.appUrl}/emails` }),
      }),
    );

    return apiJson({ ok: true }, 201);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "email_taken") {
      return apiError(409, "email_taken", "An account with that email already exists.");
    }
    console.error("[signup] error", err);
    return apiError(500, "server_error", "Could not create account.");
  }
}
