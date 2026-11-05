/**
 * /alternatives/[slug]: "<provider> alternatives" pages. Descriptions of other
 * providers stick to long-standing, publicly documented facts; we avoid
 * pricing figures for third parties because they change often.
 */
export type Vendor = { slug: string; name: string; blurb: string; bestFor: string; compare?: string };

export const VENDORS: Record<string, Vendor> = {
  stack: { slug: "stack-emails", name: "Stack Emails", blurb: "A developer-first email API and SMTP relay on Amazon SES, with broadcasts, inbound email, shared team inboxes, request-level logs, webhooks and an MCP server for AI agents. 3,000 emails a month free; paid plans from $25/month.", bestFor: "Teams that want one place for transactional email, broadcasts and inbound mail, with a familiar Resend-style API." },
  resend: { slug: "resend", name: "Resend", blurb: "A developer-focused email API from the team behind React Email, with SDKs for many languages, broadcasts and a polished dashboard.", bestFor: "React and Next.js teams that like building emails as components.", compare: "/compare/resend" },
  postmark: { slug: "postmark", name: "Postmark", blurb: "A transactional email service known for its focus on fast delivery, with separate message streams for transactional and broadcast mail.", bestFor: "Teams whose priority is transactional delivery and detailed message history.", compare: "/compare/postmark" },
  sendgrid: { slug: "sendgrid", name: "SendGrid", blurb: "Twilio's email platform, offering an email API, SMTP relay and marketing campaigns, used by many large senders.", bestFor: "Large organisations already in the Twilio ecosystem.", compare: "/compare/sendgrid" },
  mailgun: { slug: "mailgun", name: "Mailgun", blurb: "An email API and SMTP service (part of Sinch) with routing for inbound mail, email validation and US and EU regions.", bestFor: "Teams that need inbound routing rules and address validation from the same vendor.", compare: "/compare/mailgun" },
  ses: { slug: "amazon-ses", name: "Amazon SES", blurb: "AWS's raw email sending infrastructure: very low per-email cost, but you build domain setup, bounce handling, logs and templates yourself.", bestFor: "Teams on AWS with engineering time to build the pieces around it.", compare: "/compare/amazon-ses" },
  brevo: { slug: "brevo", name: "Brevo", blurb: "A marketing platform (formerly Sendinblue) that includes transactional email, SMS and a CRM.", bestFor: "Marketing teams who want campaigns, automation and transactional email in one marketing suite." },
  mailjet: { slug: "mailjet", name: "Mailjet", blurb: "A European email platform (part of Sinch) for marketing campaigns and transactional email, with a drag-and-drop editor.", bestFor: "Teams that want a visual editor and EU-based infrastructure." },
  mandrill: { slug: "mandrill", name: "Mailchimp Transactional (Mandrill)", blurb: "Mailchimp's transactional email API, available as an add-on to Mailchimp paid plans.", bestFor: "Existing Mailchimp customers who want transactional email under the same account." },
};

export type AlternativePage = {
  slug: string;
  vendor: keyof typeof VENDORS;
  lead: string;
  reasons: string[];
  picks: (keyof typeof VENDORS)[];
  switching: string;
  faq: { q: string; a: string }[];
};

export const ALTERNATIVES: AlternativePage[] = [
  {
    slug: "sendgrid",
    vendor: "sendgrid",
    lead: "Looking for a SendGrid alternative? These are the email APIs developers most often move to, what each is best at, and how to switch without downtime.",
    reasons: ["Wanting a simpler, more modern API and dashboard", "Pricing that fits their volume better", "Wanting inbound email, team inboxes or AI-agent (MCP) support in the same product", "Wanting clearer per-message logs when debugging delivery"],
    picks: ["stack", "resend", "postmark", "mailgun", "ses"],
    switching: "Most apps send through SendGrid's SMTP relay or its v3 Mail Send API. For SMTP, change the host to `smtp.stackemails.com`, the username from `apikey` to `stackemails` and the password to a Stack Emails API key. For the API, map SendGrid's `personalizations` to Stack Emails' flat `to`, `cc` and `bcc` fields. Verify your domain first and run both providers side by side until your webhooks are switched over.",
    faq: [
      { q: "What is the best SendGrid alternative?", a: "It depends on what you send. For a developer-friendly API with broadcasts and inbound email, Stack Emails or Resend; for transactional-only, Postmark; for the lowest cost with more setup, Amazon SES." },
      { q: "Is there a free alternative to SendGrid?", a: "Yes. Stack Emails includes 3,000 emails a month free (up to 100 a day) with the API, SMTP relay, webhooks and inbound email." },
      { q: "How hard is it to migrate from SendGrid?", a: "Usually a few hours: verify your domain, swap SMTP credentials or the API call, and point your webhooks at the new provider." },
    ],
  },
  {
    slug: "mailgun",
    vendor: "mailgun",
    lead: "Comparing Mailgun alternatives? Here are the email APIs teams evaluate most, what each does best, and how to move your sending and inbound routes.",
    reasons: ["Wanting a simpler pricing model for their volume", "Preferring a more modern dashboard and API", "Wanting shared team inboxes on top of inbound routing", "Wanting broadcasts and contacts in the same tool"],
    picks: ["stack", "postmark", "resend", "sendgrid", "ses"],
    switching: "Swap Mailgun's SMTP host and per-domain credentials for `smtp.stackemails.com` with username `stackemails` and an API key, or replace calls to `/v3/<domain>/messages` with `POST /v1/emails`. Mailgun inbound routes map to Stack Emails receiving: point your MX record at Stack Emails and subscribe to the `email.received` webhook.",
    faq: [
      { q: "What is a good Mailgun alternative?", a: "Stack Emails, Postmark, Resend and SendGrid are the most common choices. Stack Emails covers sending, broadcasts and inbound email with a free plan." },
      { q: "Is there a free Mailgun alternative?", a: "Stack Emails has a free plan with 3,000 emails a month, including API, SMTP and inbound email." },
    ],
  },
  {
    slug: "postmark",
    vendor: "postmark",
    lead: "Need a Postmark alternative? Here's how the main transactional email APIs compare, and what to check before you switch.",
    reasons: ["Wanting a free tier for side projects and staging", "Wanting broadcasts and contact management in the same tool", "Wanting inbound mail to land in a shared team inbox", "Wanting an MCP server so AI agents can send email"],
    picks: ["stack", "resend", "mailgun", "sendgrid", "ses"],
    switching: "Postmark's SMTP uses a server token as username and password; with Stack Emails use `stackemails` and an API key. Postmark's `/email` API fields (`From`, `To`, `HtmlBody`, `TextBody`) map to `from`, `to`, `html` and `text`. Message streams map to separate sending subdomains or tags.",
    faq: [
      { q: "What is the best Postmark alternative?", a: "For a similar developer focus with a free plan, broadcasts and inbound inboxes, Stack Emails or Resend. For raw cost, Amazon SES." },
    ],
  },
  {
    slug: "resend",
    vendor: "resend",
    lead: "Looking for a Resend alternative with the same developer experience? These providers are the closest fits, and one of them uses the same API conventions.",
    reasons: ["Wanting shared team inboxes to read and reply to inbound mail", "Wanting request-level logs with full request and response bodies", "Wanting domain-restricted sending keys", "Comparing pricing at their volume"],
    picks: ["stack", "postmark", "sendgrid", "mailgun", "ses"],
    switching: "Stack Emails follows Resend's API conventions: `POST /v1/emails` with `from`, `to`, `subject`, `html` and the same idempotency and webhook patterns. Switching is mostly a new base URL (`https://stackemails.com/v1`) and API key. React Email templates work unchanged.",
    faq: [
      { q: "Is there a Resend alternative with a compatible API?", a: "Yes. Stack Emails uses the same request shape for sending, so most code only needs a new base URL and API key." },
      { q: "Is there a free alternative to Resend?", a: "Stack Emails has a free plan with 3,000 emails a month, including API, SMTP, webhooks and inbound email." },
    ],
  },
  {
    slug: "amazon-ses",
    vendor: "ses",
    lead: "Amazon SES is cheap but bare. If you want SES-grade delivery without building domain setup, bounce handling, logs and a dashboard yourself, these are the alternatives to consider.",
    reasons: ["Not wanting to build bounce and complaint handling (SNS, suppression) themselves", "Wanting a dashboard for non-engineers", "Wanting broadcasts, contacts and templates out of the box", "Getting stuck in the SES sandbox or production-access review"],
    picks: ["stack", "postmark", "resend", "mailgun", "sendgrid"],
    switching: "Stack Emails runs on Amazon SES, so delivery infrastructure stays the same; you get domain verification, suppression, webhooks, logs, broadcasts and inbound email on top. Replace `SendEmail` calls with `POST /v1/emails`, or swap your SES SMTP credentials for `smtp.stackemails.com`.",
    faq: [
      { q: "Is there an easier alternative to Amazon SES?", a: "Yes. Services built on SES, such as Stack Emails, keep SES delivery while handling domain setup, bounces, webhooks and dashboards for you." },
    ],
  },
  {
    slug: "mandrill",
    vendor: "mandrill",
    lead: "Mailchimp Transactional (Mandrill) is tied to a Mailchimp plan. If you only need transactional email, or want it separate from marketing, these are the main alternatives.",
    reasons: ["Not wanting to pay for a Mailchimp plan just to send transactional email", "Wanting transactional mail separated from marketing tools", "Wanting a modern API and SDKs", "Wanting inbound email and webhooks in one place"],
    picks: ["stack", "postmark", "resend", "sendgrid", "mailgun"],
    switching: "Replace `messages/send` calls with `POST /v1/emails`, mapping `message.html`, `message.subject`, `message.from_email` and `message.to` to the flat Stack Emails fields. For SMTP, change the host to `smtp.stackemails.com`, username `stackemails` and an API key.",
    faq: [
      { q: "Do I need Mailchimp to use Mandrill?", a: "Mailchimp Transactional is sold as an add-on to Mailchimp's paid plans. Standalone services like Stack Emails, Postmark and Resend don't require a marketing plan." },
    ],
  },
  {
    slug: "brevo",
    vendor: "brevo",
    lead: "Using Brevo (Sendinblue) for transactional email and want a developer-first alternative? Here's what to consider.",
    reasons: ["Wanting a developer-first API instead of a marketing suite", "Wanting transactional email separate from marketing", "Wanting detailed per-request logs and webhooks", "Wanting inbound email in the same product"],
    picks: ["stack", "postmark", "resend", "mailjet", "sendgrid"],
    switching: "Brevo's SMTP relay (`smtp-relay.brevo.com`) maps to `smtp.stackemails.com` with username `stackemails` and an API key. API calls to `/v3/smtp/email` map to `POST /v1/emails` (`sender`, `to`, `htmlContent` become `from`, `to`, `html`).",
    faq: [{ q: "What is a good Brevo alternative for developers?", a: "Stack Emails, Postmark and Resend focus on developers and transactional email, with simple APIs and webhooks." }],
  },
  {
    slug: "mailjet",
    vendor: "mailjet",
    lead: "Comparing Mailjet alternatives for transactional email? These are the developer-focused options teams consider most.",
    reasons: ["Wanting a developer-first API and modern SDKs", "Wanting inbound email and team inboxes", "Wanting request logs and signed webhooks", "Wanting an MCP server for AI agents"],
    picks: ["stack", "postmark", "resend", "brevo", "mailgun"],
    switching: "Mailjet SMTP (`in-v3.mailjet.com`, API key and secret) maps to `smtp.stackemails.com` with username `stackemails` and an API key. Mailjet's Send API v3.1 `Messages` array maps to one `POST /v1/emails` per message or to the batch endpoint.",
    faq: [{ q: "What is the best Mailjet alternative?", a: "For developer-focused transactional email with broadcasts and inbound, Stack Emails; for transactional-only, Postmark." }],
  },
];

export const altBySlug = (slug: string) => ALTERNATIVES.find((a) => a.slug === slug);
