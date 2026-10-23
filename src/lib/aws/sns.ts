import { createVerify } from "node:crypto";

/**
 * Amazon SNS message authentication. Every SNS HTTP(S) delivery is signed with
 * an AWS-owned certificate; we verify the signature before trusting the body.
 * https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */
export type SnsMessage = {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation" | string;
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  SubscribeURL?: string;
  Token?: string;
};

const CERT_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/;
const certCache = new Map<string, string>();

function isAwsSnsUrl(raw: string | undefined, pathRe?: RegExp): boolean {
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && CERT_HOST.test(u.hostname) && (!pathRe || pathRe.test(u.pathname));
  } catch {
    return false;
  }
}

/** SubscribeURL must point at SNS itself — never fetch arbitrary URLs (SSRF). */
export function isSafeSubscribeUrl(raw: string | undefined): boolean {
  return isAwsSnsUrl(raw);
}

function stringToSign(m: SnsMessage): string {
  const keys =
    m.Type === "Notification"
      ? ["Message", "MessageId", ...(m.Subject !== undefined ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  return keys.map((k) => `${k}\n${(m as Record<string, string | undefined>)[k] ?? ""}\n`).join("");
}

async function fetchCert(url: string): Promise<string> {
  const cached = certCache.get(url);
  if (cached) return cached;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`cert fetch failed: ${res.status}`);
  const pem = await res.text();
  if (!pem.includes("BEGIN CERTIFICATE")) throw new Error("not a certificate");
  if (certCache.size > 50) certCache.clear();
  certCache.set(url, pem);
  return pem;
}

/**
 * Parse + verify an SNS POST body. Returns the message if the signature is
 * valid, the cert is AWS-hosted, the timestamp is fresh, and (when
 * SNS_TOPIC_ARNS is configured) the topic is on the allowlist.
 */
export async function verifySnsMessage(raw: string): Promise<{ ok: true; message: SnsMessage } | { ok: false; reason: string }> {
  let m: SnsMessage;
  try {
    m = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid json" };
  }
  if (!m || typeof m !== "object" || !m.Signature || !m.SigningCertURL || !m.Type) return { ok: false, reason: "not an SNS message" };
  if (!isAwsSnsUrl(m.SigningCertURL, /\.pem$/)) return { ok: false, reason: "untrusted signing cert url" };

  const allowed = (process.env.SNS_TOPIC_ARNS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(m.TopicArn)) return { ok: false, reason: "topic not allowed" };

  const ts = Date.parse(m.Timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 60 * 60 * 1000) return { ok: false, reason: "stale timestamp" };

  try {
    const cert = await fetchCert(m.SigningCertURL);
    const verifier = createVerify(m.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1");
    verifier.update(stringToSign(m), "utf8");
    if (!verifier.verify(cert, m.Signature, "base64")) return { ok: false, reason: "bad signature" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "verification error" };
  }
  return { ok: true, message: m };
}

/** Confirm an SNS subscription (only to genuine SNS hosts). */
export async function confirmSubscription(m: SnsMessage): Promise<boolean> {
  if (m.Type !== "SubscriptionConfirmation" || !isSafeSubscribeUrl(m.SubscribeURL)) return false;
  const res = await fetch(m.SubscribeURL!, { cache: "no-store" }).catch(() => null);
  return !!res?.ok;
}
