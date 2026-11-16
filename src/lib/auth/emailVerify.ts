import "server-only";
import { createElement } from "react";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { sendSystemEmail } from "@/lib/email/system";
import { NoticeEmail } from "@/emails/system";

/**
 * Email ownership verification. A signed link (no database row needed) proves
 * the person controls the address before they can add sending domains, which
 * keeps throwaway and fake signups from ever sending email.
 */

export { isEmailVerified } from "@/lib/auth/verified";

const TTL_MS = 48 * 3600_000;

function sign(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(`verify-email:${payload}`).digest("base64url");
}

export function makeVerifyToken(userId: string, email: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${userId}.${exp}.${Buffer.from(email.toLowerCase()).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns { userId, email } for a valid, unexpired token, else null. */
export function readVerifyToken(token: string): { userId: string; email: string } | null {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 4) return null;
  const [userId, expRaw, emailB64, sig] = parts;
  const payload = `${userId}.${expRaw}.${emailB64}`;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!Number.isFinite(Number(expRaw)) || Number(expRaw) < Date.now()) return null;
  return { userId, email: Buffer.from(emailB64, "base64url").toString("utf8") };
}

export async function sendVerificationEmail(user: { _id: unknown; email: string }) {
  const link = `${env.appUrl}/api/auth/verify-email?token=${encodeURIComponent(makeVerifyToken(String(user._id), user.email))}`;
  return sendSystemEmail({
    kind: "account_notice",
    to: user.email,
    subject: "Confirm your email for Stack Emails",
    react: createElement(NoticeEmail, {
      heading: "Confirm your email address",
      paragraphs: [
        `Please confirm that ${user.email} is your email address. You'll need to do this before adding a sending domain or inviting teammates.`,
        "This link expires in 48 hours. If you didn't create a Stack Emails account, you can ignore this email.",
      ],
      cta: { label: "Confirm email", href: link },
    }),
  });
}
