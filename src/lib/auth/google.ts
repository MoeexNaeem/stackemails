import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

/** Sign in with Google (OpenID Connect authorization code flow with PKCE). */

export const GOOGLE_STATE_COOKIE = "se_google_oauth";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export function googleEnabled(): boolean {
  return Boolean(env.google.clientId && env.google.clientSecret);
}

export function googleRedirectUri(): string {
  return `${env.appUrl.replace(/\/+$/, "")}/api/auth/google/callback`;
}

/** What we keep in the short-lived state cookie between the redirect and the callback. */
export type GoogleOAuthState = { state: string; verifier: string; nonce: string; next: string | null };

export function newGoogleOAuthState(next: string | null): GoogleOAuthState {
  return { state: randomBytes(24).toString("base64url"), verifier: randomBytes(48).toString("base64url"), nonce: randomBytes(24).toString("base64url"), next };
}

export function encodeState(s: GoogleOAuthState): string {
  return Buffer.from(JSON.stringify(s)).toString("base64url");
}

export function decodeState(raw: string | undefined): GoogleOAuthState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return typeof s?.state === "string" && typeof s?.verifier === "string" && typeof s?.nonce === "string" ? s : null;
  } catch {
    return null;
  }
}

export function googleAuthUrl(s: GoogleOAuthState): string {
  const challenge = createHash("sha256").update(s.verifier).digest("base64url");
  const q = new URLSearchParams({
    client_id: env.google.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: s.state,
    nonce: s.nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${AUTH_URL}?${q}`;
}

export type GoogleProfile = { sub: string; email: string; name: string; picture?: string };

/**
 * Swap the authorization code for tokens and read the ID token.
 * The ID token comes straight from Google's token endpoint over TLS, so per
 * OpenID Connect Core 3.1.3.7 we validate its claims rather than its signature.
 */
export async function exchangeGoogleCode(code: string, s: GoogleOAuthState): Promise<GoogleProfile> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.google.clientId,
      client_secret: env.google.clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: s.verifier,
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { id_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.id_token) throw new Error(`token exchange failed: ${data.error ?? res.status} ${data.error_description ?? ""}`.trim());

  const part = data.id_token.split(".")[1];
  if (!part) throw new Error("malformed id_token");
  const c = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;

  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!ISSUERS.has(String(c.iss))) throw new Error("id_token issuer mismatch");
  if (!aud.includes(env.google.clientId)) throw new Error("id_token audience mismatch");
  if (typeof c.exp !== "number" || c.exp * 1000 < Date.now() - 60_000) throw new Error("id_token expired");
  if (c.nonce !== s.nonce) throw new Error("id_token nonce mismatch");
  if (typeof c.sub !== "string" || typeof c.email !== "string") throw new Error("id_token missing sub or email");
  if (c.email_verified !== true && c.email_verified !== "true") throw Object.assign(new Error("email not verified"), { code: "email_unverified" });

  const email = c.email.trim().toLowerCase();
  const name = (typeof c.name === "string" && c.name.trim()) || email.split("@")[0];
  return { sub: c.sub, email, name: name.slice(0, 80), picture: typeof c.picture === "string" ? c.picture : undefined };
}
