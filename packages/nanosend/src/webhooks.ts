/**
 * Verify a Stack Emails webhook (X-StackEmails-Signature-V2: t=…,v1=…).
 * Uses Web Crypto, so it works in Node 18+, Bun, Deno and edge runtimes.
 *
 * ```ts
 * const ok = await verifyWebhook(rawBody, req.headers.get("x-stackemails-signature-v2"), process.env.STACKEMAILS_WEBHOOK_SECRET);
 * ```
 */
export async function verifyWebhook(rawBody: string, header: string | null | undefined, secret: string, toleranceSeconds = 300): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${rawBody}`)));
  const expected = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(expected, parts.v1);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
