import "server-only";
import { env } from "@/lib/env";

/**
 * Cloudflare Turnstile (bot check) on signup. Off until both TURNSTILE_SITE_KEY
 * and TURNSTILE_SECRET_KEY are set, so local dev and tests need no keys.
 */
export function turnstileSiteKey(): string | null {
  return env.turnstile.siteKey && env.turnstile.secretKey ? env.turnstile.siteKey : null;
}

export async function verifyTurnstile(token: unknown, ip?: string): Promise<boolean> {
  if (!turnstileSiteKey()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret: env.turnstile.secretKey, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    // Fail closed: if Cloudflare can't be reached, signups wait rather than letting bots through.
    console.error("[turnstile] verification failed", err);
    return false;
  }
}
