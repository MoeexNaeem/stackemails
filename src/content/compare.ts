/**
 * /compare/[slug] pages. Competitor details are kept to well-documented,
 * long-standing capabilities — we'd rather undersell a competitor than
 * misstate them. Each page carries a "last reviewed" date and a note to check
 * the vendor's site for current details.
 */
export type Comparison = {
  slug: string;
  name: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  theyShine: string[];
  weDiffer: string[];
  rows: { label: string; us: string; them: string }[];
  migrate: string;
};

export const REVIEWED = "October 2026";

export const COMPARISONS: Comparison[] = [
  {
    slug: "resend",
    name: "Resend",
    metaTitle: "Stack Emails vs Resend — a Resend alternative",
    metaDescription: "Comparing Stack Emails and Resend: API design, broadcasts, inbound inboxes, MCP, SMTP and pricing model. Switch with a near drop-in API.",
    summary: "Resend set the bar for developer-friendly email. Stack Emails follows the same API conventions — so switching is mostly changing a base URL and key — and adds shared team inboxes, an in-dashboard AI assistant and request-level logs.",
    theyShine: ["Polished developer experience and documentation", "Created React Email, the popular component library for emails", "Large ecosystem of framework guides and integrations"],
    weDiffer: ["Shared team inboxes: read, thread and reply to inbound mail from the dashboard", "Request logs store request and response bodies for every API call", "Built-in AI assistant that answers questions about your own account", "Sending-only API keys can be restricted to a single domain"],
    rows: [
      { label: "REST API & Node.js SDK", us: "Yes", them: "Yes" },
      { label: "React Email support", us: "Yes", them: "Yes" },
      { label: "Batch & scheduled sends", us: "Yes (100 / batch, 30 days ahead)", them: "Yes" },
      { label: "Broadcasts, contacts & topics", us: "Yes", them: "Yes" },
      { label: "Webhooks with signatures", us: "Yes", them: "Yes" },
      { label: "SMTP relay", us: "Yes", them: "Yes" },
      { label: "Shared inboxes with replies", us: "Yes", them: "Check vendor" },
      { label: "MCP server for AI agents", us: "Yes", them: "Yes" },
      { label: "Free plan", us: "3,000 emails / month", them: "Yes" },
    ],
    migrate: "Stack Emails accepts the same request shape for POST /emails (from, to, subject, html, text, reply_to, headers, attachments, tags, scheduled_at). Change the base URL to https://stackemails.com, swap the API key, and verify your domain.",
  },
  {
    slug: "sendgrid",
    name: "SendGrid",
    metaTitle: "Stack Emails vs SendGrid — a modern SendGrid alternative",
    metaDescription: "Comparing Stack Emails and Twilio SendGrid for transactional and marketing email: developer experience, setup, pricing model and features.",
    summary: "Twilio SendGrid is one of the most established email platforms, with a very broad feature set. Stack Emails is deliberately smaller: one clean API, one dashboard and one audience for both product and marketing email.",
    theyShine: ["Long track record at very high volumes", "Extensive marketing tooling and integrations", "Dedicated IP and sub-user management for large organisations"],
    weDiffer: ["A single modern API and SDK rather than several generations of APIs", "Transactional and marketing email share one contact list and one dashboard", "Setup in minutes: DKIM, return-path and DMARC records generated together", "Native MCP server so AI agents can send and read email"],
    rows: [
      { label: "REST API & SDKs", us: "Yes", them: "Yes" },
      { label: "SMTP relay", us: "Yes", them: "Yes" },
      { label: "Marketing campaigns", us: "Broadcasts with segments & topics", them: "Yes" },
      { label: "Inbound email", us: "Yes, with shared inboxes", them: "Yes (Inbound Parse)" },
      { label: "Webhooks", us: "Signed, retried 6×", them: "Yes" },
      { label: "MCP server for AI agents", us: "Yes", them: "Check vendor" },
      { label: "Free plan", us: "3,000 emails / month", them: "Check vendor" },
    ],
    migrate: "Map SendGrid's personalizations to one Stack Emails request per recipient (or use the batch endpoint for up to 100 at a time), move dynamic templates to Stack Emails templates or React Email, and point your Event Webhook consumer at our webhook format.",
  },
  {
    slug: "amazon-ses",
    name: "Amazon SES",
    metaTitle: "Stack Emails vs Amazon SES — SES with a dashboard",
    metaDescription: "Stack Emails runs on Amazon SES and adds what raw SES leaves to you: per-email logs, webhooks, contacts, broadcasts, inbound inboxes and a developer-friendly API.",
    summary: "Amazon SES is the delivery engine underneath Stack Emails. SES is excellent infrastructure, but on its own you build the rest: event pipelines, logs, suppression handling, contact management and a UI for your team.",
    theyShine: ["Very low per-email cost at scale", "Deep AWS integration (IAM, SNS, CloudWatch)", "Highly reliable, global delivery infrastructure"],
    weDiffer: ["Per-email timelines and searchable logs without building an SNS → database pipeline", "Signed webhooks with retries instead of wiring up SNS topics", "Contacts, segments, topics and broadcasts with hosted unsubscribe", "A dashboard your whole team can use, with roles and invitations"],
    rows: [
      { label: "Delivery infrastructure", us: "Amazon SES", them: "Amazon SES" },
      { label: "Per-email logs & event timeline", us: "Built in", them: "Build with SNS / Kinesis" },
      { label: "Webhooks", us: "Built in, signed & retried", them: "Via SNS" },
      { label: "Suppression handling", us: "Automatic, per team", them: "Account-level list" },
      { label: "Broadcasts & contacts", us: "Yes", them: "Not a core feature" },
      { label: "Team dashboard & roles", us: "Yes", them: "AWS console / IAM" },
      { label: "Free plan", us: "3,000 emails / month", them: "Free tier for new accounts" },
    ],
    migrate: "If you already have SES identities, add the same domains to Stack Emails and publish the DKIM records shown. Replace SendEmail calls with POST /v1/emails and subscribe to our webhooks instead of SNS topics.",
  },
  {
    slug: "mailgun",
    name: "Mailgun",
    metaTitle: "Stack Emails vs Mailgun — a simpler Mailgun alternative",
    metaDescription: "Comparing Stack Emails and Mailgun: API, inbound routing, webhooks, broadcasts and developer experience.",
    summary: "Mailgun is a mature, developer-oriented email service known for its inbound routing and validation tools. Stack Emails focuses on a smaller, more opinionated surface with a modern dashboard and AI-agent support.",
    theyShine: ["Mature inbound routing rules", "Email address validation products", "Long-standing API used by many frameworks"],
    weDiffer: ["JSON API with typed SDK and idempotency keys", "Shared inboxes to read and reply to inbound mail", "Broadcasts with contacts, segments and subscription topics", "MCP server for AI agents"],
    rows: [
      { label: "REST API & SDKs", us: "Yes", them: "Yes" },
      { label: "SMTP relay", us: "Yes", them: "Yes" },
      { label: "Inbound email", us: "Yes, with shared inboxes", them: "Yes (Routes)" },
      { label: "Webhooks", us: "Signed, retried 6×", them: "Yes" },
      { label: "Broadcasts & contacts", us: "Yes", them: "Check vendor" },
      { label: "MCP server for AI agents", us: "Yes", them: "Check vendor" },
    ],
    migrate: "Mailgun's form-encoded messages endpoint maps directly onto our JSON fields. Replace Routes with an inbound domain and the email.received webhook.",
  },
  {
    slug: "postmark",
    name: "Postmark",
    metaTitle: "Stack Emails vs Postmark — a Postmark alternative",
    metaDescription: "Comparing Stack Emails and Postmark for transactional email: speed, message streams, broadcasts, inbound and developer tools.",
    summary: "Postmark has a strong reputation for fast transactional delivery and separates transactional and broadcast traffic into message streams. Stack Emails takes a similar stance on separation using per-domain reputations, and adds contacts, topics and AI-agent tooling.",
    theyShine: ["Reputation for fast transactional delivery", "Message streams separating transactional and broadcast mail", "Detailed, well-written documentation"],
    weDiffer: ["Contacts, segments and subscription topics for marketing email", "Shared inboxes for inbound mail", "Sending-only API keys scoped to one domain", "MCP server and an in-dashboard AI assistant"],
    rows: [
      { label: "REST API & SDKs", us: "Yes", them: "Yes" },
      { label: "Separate transactional / marketing", us: "Per-domain reputation", them: "Message streams" },
      { label: "Inbound email", us: "Yes, with shared inboxes", them: "Yes" },
      { label: "Webhooks", us: "Signed, retried 6×", them: "Yes" },
      { label: "Broadcasts with segments & topics", us: "Yes", them: "Check vendor" },
      { label: "MCP server for AI agents", us: "Yes", them: "Check vendor" },
    ],
    migrate: "Map Postmark's From/To/Subject/HtmlBody/TextBody fields to from/to/subject/html/text, move templates into Stack Emails, and use a separate subdomain for broadcast traffic.",
  },
];

export const comparisonBySlug = (slug: string) => COMPARISONS.find((c) => c.slug === slug);
