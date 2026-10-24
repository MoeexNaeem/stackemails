/**
 * Public-site configuration shared by metadata, sitemaps, JSON-LD, RSS and
 * llms.txt. SITE_URL is the canonical origin search engines should index  - 
 * it defaults to production even in dev so canonicals never point at localhost.
 */
export const site = {
  name: "Stack Emails",
  legalName: "Stack Emails",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://stackemails.com").replace(/\/$/, ""),
  domain: "stackemails.com",
  tagline: "The email API for developers",
  description:
    "Stack Emails is the email API for developers. Send transactional and marketing email with a clean REST API, typed SDKs, verified domains, real-time webhooks and inbound inboxes, built on Amazon SES.",
  keywords: [
    "email API",
    "transactional email",
    "email API for developers",
    "SMTP service",
    "send email API",
    "Resend alternative",
    "SendGrid alternative",
    "Amazon SES",
    "email deliverability",
    "DKIM SPF DMARC",
    "marketing email",
    "broadcast email",
    "React Email",
    "email webhooks",
    "inbound email API",
  ],
  locale: "en_US",
  twitter: "@stackemails",
  supportEmail: "support@stackemails.com",
  social: {
    x: "https://x.com/stackemails",
    github: "https://github.com/stackemails",
    linkedin: "https://www.linkedin.com/company/stackemails",
  },
} as const;

/** Absolute URL for a site path. */
export function absUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Serialize JSON-LD safely for a <script> tag (escapes `<` to stop XSS breakouts). */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
