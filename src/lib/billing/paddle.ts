import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Paddle Billing: hosted card/PayPal checkout (Paddle.js overlay), webhooks
 * that switch plans on, and the Paddle customer portal for cancelling or
 * changing the payment method. Paddle is the merchant of record, so it also
 * handles sales tax/VAT and sends the invoices.
 */

const API_BASE = () => (env.paddle.environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com");

export function paddleEnabled(): boolean {
  const p = env.paddle;
  return Boolean(p.apiKey && p.clientToken && p.pricePro && p.priceScale);
}

/** What the browser needs to open a checkout. */
export function paddlePublicConfig() {
  return paddleEnabled() ? { token: env.paddle.clientToken, sandbox: env.paddle.environment !== "production" } : null;
}

/** Plan slug -> Paddle price ID, and back. */
export function paddlePriceFor(slug: string): string | null {
  if (slug === "pro") return env.paddle.pricePro || null;
  if (slug === "scale") return env.paddle.priceScale || null;
  return null;
}
export function planSlugForPrice(priceId: string | undefined | null): "pro" | "scale" | null {
  if (!priceId) return null;
  if (priceId === env.paddle.pricePro) return "pro";
  if (priceId === env.paddle.priceScale) return "scale";
  return null;
}

export async function paddleApi<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API_BASE()}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${env.paddle.apiKey}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: { detail?: string; code?: string } };
  if (!res.ok) throw new Error(json.error?.detail || json.error?.code || `Paddle API ${res.status}`);
  return json.data as T;
}

/**
 * Verify the Paddle-Signature header ("ts=...;h1=...") against the raw body.
 * Paddle signs `${ts}:${rawBody}` with HMAC-SHA256 using the endpoint secret.
 */
export function verifyPaddleSignature(rawBody: string, header: string | null, toleranceSec = 300): boolean {
  const secret = env.paddle.webhookSecret;
  if (!secret || !header) return false;
  let ts = "";
  const sigs: string[] = [];
  for (const part of header.split(";")) {
    const [k, v] = part.split("=");
    if (k === "ts") ts = v ?? "";
    else if (k === "h1" && v) sigs.push(v);
  }
  if (!/^\d+$/.test(ts) || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > toleranceSec) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${ts}:${rawBody}`, "utf8").digest("hex"));
  return sigs.some((s) => {
    const got = Buffer.from(s);
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/** Short-lived link to Paddle's customer portal (cancel, payment method, invoices). */
export async function paddlePortalUrl(customerId: string, subscriptionId?: string | null): Promise<string> {
  const data = await paddleApi<{ urls: { general: { overview: string } } }>(`/customers/${encodeURIComponent(customerId)}/portal-sessions`, {
    method: "POST",
    body: subscriptionId ? { subscription_ids: [subscriptionId] } : {},
  });
  return data.urls.general.overview;
}

/** Move an existing subscription to another plan, charging/crediting the difference now. */
export async function paddleChangePlan(subscriptionId: string, priceId: string): Promise<void> {
  await paddleApi(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    body: { items: [{ price_id: priceId, quantity: 1 }], proration_billing_mode: "prorated_immediately" },
  });
}
