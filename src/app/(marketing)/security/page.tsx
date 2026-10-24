import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/marketing/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Security",
  description: "How Stack Emails protects your account, your API keys and the email you send, and how to report a vulnerability.",
  path: "/security",
});

const MD = `Security is built into how Stack Emails works, not bolted on. This page describes the controls in place today. We don't claim certifications we don't have.

## Infrastructure

- Email is delivered through **Amazon SES**, with DKIM signing using 2048-bit keys.
- All traffic to the website, dashboard and API is encrypted with TLS.
- The SMTP relay requires TLS (implicit on 465, STARTTLS on 587).

## Accounts

- Passwords are hashed with bcrypt; we never store them in plain text.
- **Two-factor authentication** (TOTP) with one-time recovery codes. Secrets are encrypted at rest with AES-256-GCM.
- Sign-in is rate limited and uses constant-time checks to resist credential stuffing and account enumeration.
- Sessions are HTTP-only, secure cookies and can be revoked by signing out.
- Teams have **roles** (owner, admin, member); destructive and billing actions require an owner or admin.

## API keys

- Keys are shown once and stored only as hashes.
- **Sending-access** keys can't read data or change settings, and can be **restricted to one domain**.
- Every request is logged with its key, so you can audit usage and revoke keys instantly.

## Sending safeguards

- You can only send from domains you've verified with DNS.
- Hard-bounced and complained addresses are suppressed automatically.
- One-click unsubscribe (RFC 8058) on all broadcasts.

## Webhooks

- Every webhook is signed with HMAC-SHA256 over a timestamp and the raw body, so receivers can reject forged or replayed events.
- Webhook endpoints must be public HTTPS URLs; private and internal network addresses are blocked on every attempt to prevent server-side request forgery.
- Incoming Amazon SNS notifications are verified against AWS's signing certificate before they're processed.

## Email content

- Email previews in the dashboard are rendered in sandboxed frames, so scripts in an email can't run.

## Reporting a vulnerability

If you believe you've found a security issue, email **${site.supportEmail}** with the subject "Security". Please include steps to reproduce, and give us reasonable time to fix the issue before disclosing it. We won't take legal action against good-faith research that avoids privacy violations, data destruction and service disruption.

Our [security.txt](/.well-known/security.txt) has the same details in machine-readable form.`;

export default function SecurityPage() {
  return <LegalPage eyebrow="Trust" title="Security at Stack Emails" markdown={MD} />;
}
