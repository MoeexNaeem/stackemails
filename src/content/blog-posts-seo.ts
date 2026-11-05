import type { SeedPost } from "./blog-posts";

/**
 * November 2026 articles targeting researched keywords (Ahrefs, US volumes):
 * transactional email (4.5K), best email api (1.2K) / free email api (1.8K),
 * free smtp server (1.3K), smtp port (4.0K), dmarc policy (1.4K),
 * send email with attachment (500). Third-party pricing was checked on the
 * vendors' pricing pages on 2026-11-05.
 */
export const SEO_POSTS: SeedPost[] = [
  {
    slug: "what-is-transactional-email",
    title: "What is transactional email? Definition, examples and best practices",
    excerpt: "Transactional emails are the messages your product sends because a user did something: password resets, receipts, login codes. Here's what counts, how they differ from marketing email, and how to make sure they arrive.",
    category: "Guides",
    tags: ["transactional-email", "deliverability", "best-practices"],
    publishedAt: "2026-11-05T09:00:00.000Z",
    featured: true,
    seoTitle: "What is transactional email? Definition, 12 examples and best practices",
    seoDescription: "Transactional email explained: what it is, 12 real examples, how it differs from marketing email, legal rules, and best practices for fast, reliable delivery.",
    content: `A **transactional email** is a message sent to one person because of something they did, or something that happened to their account. Password resets, login codes, receipts and shipping updates are all transactional. The user expects them, often right now, and they usually carry information the user needs.

That makes transactional email the most important email your product sends. A newsletter that arrives an hour late is fine. A login code that arrives an hour late is a lost customer.

## 12 examples of transactional email

| Category | Examples |
| --- | --- |
| Account and security | [Email verification](/email-templates/email-verification), [password reset](/email-templates/password-reset), [magic link](/email-templates/magic-link), [one-time codes](/email-templates/verification-code), [new sign-in alerts](/email-templates/new-login-alert) |
| Commerce | [Order confirmation](/email-templates/order-confirmation), [shipping updates](/email-templates/shipping-confirmation), [receipts](/email-templates/payment-receipt), [invoices](/email-templates/invoice) |
| Billing | [Failed payments](/email-templates/payment-failed), [trial ending](/email-templates/trial-ending) |
| Collaboration | [Team invitations](/email-templates/team-invitation), mentions, comment notifications |

Every link above goes to a free, ready-to-use template.

## Transactional vs marketing email

| | Transactional | Marketing |
| --- | --- | --- |
| Trigger | A user action or account event | Your campaign schedule |
| Recipients | One person | Many subscribers |
| Consent | Implied by the relationship | Explicit opt-in |
| Unsubscribe link | Usually not required | Required (one-click for bulk senders) |
| Timing | Seconds matter | Minutes or hours are fine |

The line matters legally. Under CAN-SPAM in the US, a message whose *primary purpose* is transactional or relationship content is exempt from most commercial-email rules. Add a big promotion to your receipt and it may stop qualifying. GDPR and similar laws still apply to the personal data inside. We cover the differences in more depth in [transactional vs marketing email](/blog/transactional-vs-marketing-email).

## How transactional email gets sent

Most products don't send email from their own servers. They call an **email API** or **SMTP relay** that handles authentication, retries, bounces and reputation:

\`\`\`bash
curl -X POST https://stackemails.com/v1/emails \\
  -H "Authorization: Bearer $STACKEMAILS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "Acme <security@mail.acme.com>",
    "to": "ada@example.com",
    "subject": "482 913 is your Acme login code",
    "text": "Your code is 482 913. It expires in 10 minutes."
  }'
\`\`\`

We have copy-paste guides for [Node.js](/send-email/nodejs), [Python](/send-email/python), [PHP](/send-email/php), [Laravel](/send-email/laravel), [Rails](/send-email/rails), [Go](/send-email/go) and [many more](/send-email).

## Best practices that actually move delivery

### 1. Use a dedicated subdomain

Send transactional mail from something like \`mail.acme.com\` and marketing from \`news.acme.com\`. Reputation is tracked per domain, so a marketing campaign that draws complaints can't drag your password resets into spam.

### 2. Authenticate with SPF, DKIM and DMARC

Gmail and Yahoo now reject or filter unauthenticated mail. Set up all three and check them with our free [SPF](/tools/spf-checker), [DKIM](/tools/dkim-checker) and [DMARC](/tools/dmarc-checker) tools. The [setup guide](/blog/spf-dkim-dmarc-setup-guide) walks through it.

### 3. Send immediately, retry safely

Queue the send, but don't batch it. Use an [idempotency key](/glossary/idempotency-key) so a timeout and retry never produce two password-reset emails.

### 4. Always include a plain-text part

It helps accessibility, some spam filters, and anyone reading on a watch.

### 5. Watch bounces and complaints

Subscribe to [webhooks](/blog/email-webhooks-guide) for bounces and spam complaints, and never send to an address that hard-bounced. Keep complaints under 0.1%.

### 6. Keep it focused

One purpose, one call to action. Put the important information (the code, the amount, the date) in the subject or preheader so it shows in notifications.

## Choosing a transactional email service

Look for: a clean API and SMTP option, automatic domain authentication, suppression lists, delivery webhooks, per-message logs, and a free tier for development. We compare the main options in [the best email APIs for developers](/blog/best-email-api). [Stack Emails](/features/transactional-email) includes 3,000 emails a month free.`,
  },
  {
    slug: "best-email-api",
    title: "The best email APIs for developers in 2026 (free tiers compared)",
    excerpt: "An honest comparison of the main transactional email APIs: what each is good at, what their free tiers include, and how to choose.",
    category: "Guides",
    tags: ["email-api", "transactional-email", "comparison"],
    publishedAt: "2026-11-05T12:00:00.000Z",
    seoTitle: "Best email APIs for developers in 2026: free tiers and pricing compared",
    seoDescription: "Comparing the best transactional email APIs in 2026: Stack Emails, Resend, Postmark, Mailgun, SendGrid and Amazon SES. Free tiers, pricing and how to choose.",
    content: `Every product needs to send email, and almost nobody should run their own mail servers. An **email API** takes a JSON request and handles the hard parts: authentication, queuing, retries, bounces and reputation.

We build one of the products below, so we've tried to be fair: each provider gets what it's genuinely good at, and pricing comes from their public pricing pages as of November 2026. Prices change, so check before you buy.

## What to look for

1. **A clean API and SDKs** in your language, plus an [SMTP relay](/glossary/smtp-relay) for tools that only speak SMTP.
2. **Domain authentication** that sets up [SPF](/glossary/spf), [DKIM](/glossary/dkim) and a custom return path for you.
3. **Webhooks** for delivered, bounced and complained events, with signatures.
4. **Suppression lists** so you never mail a dead address twice.
5. **Logs** you can search when a customer says "I never got the email".
6. **A real free tier** for development and small projects.

## Free tiers at a glance

| Provider | Free tier | First paid tier |
| --- | --- | --- |
| Stack Emails | 3,000 emails/month (100/day) | $25/month for 150,000 emails |
| Resend | 3,000 emails/month (100/day) | $20/month for 50,000 emails |
| Mailgun | 100 emails/day | $15/month for 10,000 emails |
| Amazon SES | AWS Free Tier credits for new accounts | $0.10 per 1,000 emails |
| Postmark | Developer tier for testing | Check postmarkapp.com/pricing |
| SendGrid | Check current plans | Check sendgrid.com/pricing |

*Checked on the providers' pricing pages in November 2026.*

## The options

### Stack Emails

Our product: a Resend-style REST API and SMTP relay on Amazon SES, with broadcasts, contacts, [inbound email](/features/inbound-email) into shared team inboxes, request logs that keep the full request and response, signed webhooks and an [MCP server](/features/mcp-server) so AI agents can send email. **Best for** teams that want transactional email, newsletters and inbound mail in one place, with a generous paid tier (150,000 emails for $25).

### Resend

The team behind React Email built a polished developer experience with SDKs for many languages and a strong docs site. **Best for** React and Next.js teams who build emails as components. See [Stack Emails vs Resend](/compare/resend).

### Postmark

Postmark has focused on transactional email for years, with separate message streams for transactional and broadcast mail and long message history. **Best for** teams whose top priority is transactional delivery. See [Postmark alternatives](/alternatives/postmark).

### Mailgun

A long-standing API with inbound routing rules, email validation, and US and EU regions. **Best for** teams who need routing and validation from the same vendor. See [Mailgun alternatives](/alternatives/mailgun).

### SendGrid

Twilio's platform covers the email API, SMTP relay and marketing campaigns at very large scale. **Best for** big organisations already using Twilio. See [SendGrid alternatives](/alternatives/sendgrid).

### Amazon SES

The cheapest per email, but it's infrastructure, not a product: you build domain setup, bounce handling, logs and templates yourself, and new accounts start in a sandbox. **Best for** AWS-heavy teams with engineering time. Services like Stack Emails run on SES and add the missing pieces; see [Stack Emails vs Amazon SES](/compare/amazon-ses).

## How to choose

- **Just need password resets and receipts?** Any of the above works. Pick the API you find nicest and check its free tier.
- **Sending newsletters too?** Choose a provider with broadcasts and one-click unsubscribe built in, and send them from a separate subdomain.
- **Receiving email?** Check inbound support: parsing, threading and whether replies can be answered from a dashboard.
- **High volume on a budget?** Compare the price at *your* monthly volume, not the headline plan.

Whichever you choose, test it in a few minutes: our [send email guides](/send-email) cover 20+ languages, and the [free DNS tools](/tools) confirm your domain is set up correctly.`,
  },
  {
    slug: "free-smtp-servers",
    title: "Free SMTP servers for sending email in 2026",
    excerpt: "The free SMTP options that actually work for apps, websites and devices, their limits, and when a free mailbox isn't enough.",
    category: "Guides",
    tags: ["smtp", "smtp-relay", "free-tools"],
    publishedAt: "2026-11-05T15:00:00.000Z",
    seoTitle: "Free SMTP servers in 2026: limits, settings and the best options",
    seoDescription: "Free SMTP servers you can use to send email from apps, WordPress and devices: Gmail, Outlook, Stack Emails, Mailgun and more, with limits and settings.",
    content: `Need to send email from an app, a WordPress site, a printer or a script without paying? You have two kinds of free SMTP server: **personal mailboxes** (Gmail, Outlook, Yahoo) and **free tiers of email services**. They're good for very different things.

## Option 1: your personal mailbox

| Provider | SMTP server | Port | Login |
| --- | --- | --- | --- |
| Gmail | \`smtp.gmail.com\` | 587 / 465 | App password |
| Outlook.com | \`smtp-mail.outlook.com\` | 587 | Modern auth (OAuth) |
| Yahoo | \`smtp.mail.yahoo.com\` | 465 / 587 | App password |
| iCloud | \`smtp.mail.me.com\` | 587 | App-specific password |

Full details: [Gmail](/smtp-settings/gmail), [Outlook](/smtp-settings/outlook), [Yahoo](/smtp-settings/yahoo), [iCloud](/smtp-settings/icloud).

**Good for:** personal scripts, a home server's alerts, a printer's scan-to-email.

**Not good for apps or websites**, because:

- Daily caps are low (a personal Gmail account allows around 500 recipients a day).
- Mail is sent as *your personal address*, not your domain.
- Providers are moving away from passwords: Outlook.com now needs OAuth, Gmail needs app passwords.
- A misbehaving script can get your personal account locked.

## Option 2: free tiers of transactional email services

These send from **your own domain**, with SPF and DKIM, bounce handling and logs. Free tiers as of November 2026:

| Service | Free allowance | SMTP host |
| --- | --- | --- |
| [Stack Emails](/smtp-settings/stack-emails) | 3,000/month (100/day) | \`smtp.stackemails.com\` |
| [Resend](/smtp-settings/resend) | 3,000/month (100/day) | \`smtp.resend.com\` |
| [Mailgun](/smtp-settings/mailgun) | 100/day | \`smtp.mailgun.org\` |
| [Brevo](/smtp-settings/brevo) | Free plan with a daily cap | \`smtp-relay.brevo.com\` |

**Good for:** websites, side projects, staging environments and early-stage products.

## What "free SMTP server without authentication" really means

You'll see people searching for SMTP servers that need no login. Open relays like that don't legitimately exist any more: an unauthenticated relay would be used by spammers within hours and blocklisted. Any server that accepts mail from you will either require a username and password, or restrict access by IP address (like Google Workspace's [SMTP relay service](/smtp-settings/google-workspace) or Microsoft 365's connectors).

## Testing SMTP without sending real email

For development, use a local catcher such as Mailpit or MailHog: it accepts any SMTP message on \`localhost:1025\` and shows it in a web UI, without delivering anything. Switch to a real provider for staging and production.

## Setting up a free SMTP relay in 5 minutes

1. [Create a free Stack Emails account](/signup).
2. Add your domain and publish the DNS records shown. Check them with the [SPF checker](/tools/spf-checker).
3. Create an API key and configure your app:

| Setting | Value |
| --- | --- |
| Host | \`smtp.stackemails.com\` |
| Port | 465 (SSL) or 587 (STARTTLS) |
| Username | \`stackemails\` |
| Password | Your API key |

Not sure which port to use? Read [SMTP ports explained](/blog/smtp-ports-25-465-587-2525).`,
  },
  {
    slug: "smtp-ports-25-465-587-2525",
    title: "SMTP ports explained: 25 vs 465 vs 587 vs 2525",
    excerpt: "Which SMTP port should you use? A clear guide to ports 25, 465, 587 and 2525, what STARTTLS and implicit TLS mean, and how to fix blocked ports.",
    category: "Guides",
    tags: ["smtp", "infrastructure", "best-practices"],
    publishedAt: "2026-11-05T16:00:00.000Z",
    seoTitle: "SMTP ports explained: 25, 465, 587 and 2525 (which to use)",
    seoDescription: "Which SMTP port should you use? Port 587 with STARTTLS or 465 with TLS for sending, 25 for server-to-server relay, 2525 as a fallback. Explained with examples.",
    content: `**Short answer:** to send email from an app, device or mail client, use **port 587 with STARTTLS** or **port 465 with implicit TLS**. Port 25 is for server-to-server delivery and is blocked on most home and cloud networks. Port 2525 is an unofficial fallback some providers offer when 587 is blocked.

## The four ports at a glance

| Port | Purpose | Encryption | Use it when |
| --- | --- | --- | --- |
| **25** | Server-to-server relay (MTA to MTA) | Optional STARTTLS | You run a mail server receiving mail. Not for sending from apps. |
| **587** | Message submission | STARTTLS (upgrade) | Default choice for apps and mail clients. |
| **465** | Message submission | Implicit TLS from the first byte | Your library expects TLS on connect, or 587 is blocked. |
| **2525** | Unofficial alternate submission port | STARTTLS | Your network blocks 587 and 465. |

## Port 25: for servers, not apps

Port 25 is how mail servers hand messages to each other, and it's where spam from infected machines would flow. That's why residential ISPs (Comcast, AT&T and others), and cloud providers including AWS, Google Cloud and Azure, block or throttle outbound port 25 by default. If your app "can't connect" on 25, that's almost certainly why. Don't fight it: submit mail on 587 or 465 to an authenticated relay.

## Port 587 and STARTTLS

Port 587 is the standard *submission* port (RFC 6409). The client connects in plain text, sends \`EHLO\`, then \`STARTTLS\` to upgrade the connection to TLS before authenticating. A properly configured client refuses to send credentials if the upgrade fails. More on [STARTTLS](/glossary/starttls).

In most libraries:

\`\`\`js
// Nodemailer, port 587
nodemailer.createTransport({ host: "smtp.stackemails.com", port: 587, secure: false, requireTLS: true, auth: { user: "stackemails", pass: process.env.STACKEMAILS_API_KEY } });
\`\`\`

## Port 465 and implicit TLS

Port 465 was briefly registered for SMTPS in the 1990s, deprecated, and then officially re-registered for submission over implicit TLS by RFC 8314 in 2018. TLS starts before any SMTP command, like HTTPS. RFC 8314 actually recommends implicit TLS for submission. In most libraries this is \`secure: true\` or \`SMTP_SSL\`:

\`\`\`python
# Python, port 465
with smtplib.SMTP_SSL("smtp.stackemails.com", 465) as smtp:
    smtp.login("stackemails", api_key)
\`\`\`

## 587 or 465?

Both are secure and widely supported. Pick whichever your library makes easiest:

- Use **465** when the library has a simple "SSL/TLS" toggle, or when you want TLS guaranteed from the first byte.
- Use **587** when the setting is labelled "STARTTLS" or "TLS" (some apps call STARTTLS "TLS" and implicit TLS "SSL").

The classic mistake is mixing them: port 465 with STARTTLS, or port 587 with SSL. The connection hangs or fails with a "wrong version number" error.

## Port 2525

Not an official standard, but many email services (including SendGrid, Mailgun and Postmark) listen on 2525 as an alternative submission port for networks that block the others. Treat it as a fallback.

## Troubleshooting a blocked port

From the machine that sends mail:

\`\`\`bash
# Test TCP connectivity
nc -vz smtp.stackemails.com 587

# Test the TLS handshake on 465
openssl s_client -connect smtp.stackemails.com:465 -quiet
\`\`\`

If the connection times out on every port, the network blocks outbound SMTP. Use an **HTTP email API** instead: it runs over port 443 like any web request. See our [send email guides](/send-email).

## SMTP settings for popular providers

Looking up a specific provider? We keep [SMTP settings for 25+ providers](/smtp-settings), including [Gmail](/smtp-settings/gmail), [Office 365](/smtp-settings/office-365), [Outlook](/smtp-settings/outlook), [SendGrid](/smtp-settings/sendgrid) and [Amazon SES](/smtp-settings/amazon-ses).`,
  },
  {
    slug: "dmarc-policy-none-quarantine-reject",
    title: "DMARC policy explained: p=none vs quarantine vs reject",
    excerpt: "What each DMARC policy does, which one you need for Gmail and Yahoo, and a safe step-by-step path from p=none to p=reject.",
    category: "Deliverability",
    tags: ["dmarc", "deliverability", "dkim", "spf"],
    publishedAt: "2026-11-05T17:00:00.000Z",
    seoTitle: "DMARC policy explained: none vs quarantine vs reject (and how to move up)",
    seoDescription: "DMARC p=none, p=quarantine and p=reject explained, what Gmail and Yahoo require, and a safe rollout plan from monitoring to full enforcement.",
    content: `A DMARC record's \`p=\` tag tells receiving servers what to do with mail that claims to be from your domain but fails authentication. There are three choices, and picking the right one at the right time is the difference between protecting your domain and blocking your own invoices.

## The three policies

| Policy | What receivers do with failing mail | Protects against spoofing? |
| --- | --- | --- |
| \`p=none\` | Deliver as normal, but send you reports | No, monitoring only |
| \`p=quarantine\` | Treat as suspicious, usually the spam folder | Partly |
| \`p=reject\` | Refuse the message during SMTP | Yes |

A message **passes** DMARC when SPF or DKIM passes *and* the authenticated domain [aligns](/glossary/dmarc-alignment) with the visible From domain. Failing both means the policy applies.

## What do Gmail and Yahoo require?

Since 2024, anyone sending more than 5,000 messages a day to Gmail or Yahoo users must publish a DMARC record. **\`p=none\` is enough to meet the requirement**, as long as SPF and DKIM pass and align. Enforcement (quarantine or reject) is recommended but not required. Details in our [Gmail and Yahoo sender requirements guide](/blog/gmail-yahoo-bulk-sender-requirements).

## A safe rollout plan

### Step 1: monitor (p=none)

\`\`\`
_dmarc.acme.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@acme.com"
\`\`\`

Receivers start sending daily XML **aggregate reports** to the \`rua\` address, listing every server that sent mail claiming to be you and whether it passed.

### Step 2: find and fix every legitimate sender

Typical sources: your Google Workspace or Microsoft 365 mailboxes, your transactional email provider, your newsletter tool, a helpdesk, a CRM, invoicing software. For each one, set up DKIM signing with *your* domain (and a custom return path where offered). Check them with the [DKIM checker](/tools/dkim-checker) and [SPF checker](/tools/spf-checker).

Give it two to four weeks so monthly senders (invoices, reports) show up.

### Step 3: quarantine, gradually

\`\`\`
v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@acme.com
\`\`\`

\`pct=25\` applies the policy to a quarter of failing mail. Increase to 50, then 100 while watching reports and support tickets.

### Step 4: reject

\`\`\`
v=DMARC1; p=reject; rua=mailto:dmarc@acme.com
\`\`\`

Now spoofed mail using your domain is refused outright, and you're eligible for [BIMI](/glossary/bimi) logos.

## Subdomains

By default subdomains inherit \`p\`. Use \`sp=\` to set a different subdomain policy, for example \`p=reject; sp=quarantine\` while you finish authenticating subdomain senders. If you send app email from \`mail.acme.com\` through Stack Emails, it's already DKIM-signed and aligned.

## Common mistakes

- **Two DMARC records.** Receivers ignore DMARC entirely if there's more than one.
- **Jumping straight to p=reject.** You'll block your own legitimate mail from tools you forgot about.
- **No rua address.** Without reports you're enforcing blind.
- **Assuming SPF pass means DMARC pass.** Not if the return-path domain doesn't align.

Check your current record with the free [DMARC checker](/tools/dmarc-checker), or build a new one with the [DMARC generator](/tools/dmarc-generator).`,
  },
  {
    slug: "send-email-with-attachments",
    title: "How to send email with attachments using an API (with code)",
    excerpt: "Send PDFs, images and CSVs as email attachments from Node.js, Python, PHP and cURL, plus the size limits and deliverability rules to know.",
    category: "Guides",
    tags: ["attachments", "email-api", "transactional-email"],
    publishedAt: "2026-11-05T18:00:00.000Z",
    seoTitle: "How to send email with attachments via API: Node.js, Python, PHP",
    seoDescription: "Send email attachments through an email API: base64-encode the file and add it to the request. Code for Node.js, Python, PHP and cURL, with size limits.",
    content: `Invoices, receipts, reports and tickets often need a file attached. With an email API there's no MIME to build by hand: you **base64-encode the file** and add it to an \`attachments\` array.

\`\`\`json
"attachments": [
  { "filename": "invoice-1042.pdf", "content": "JVBERi0xLjQKJ..." }
]
\`\`\`

Stack Emails accepts up to 20 attachments and 10 MB in total per email. The content type is detected from the file extension, or you can pass \`content_type\`.

## Node.js

\`\`\`js
import { readFile } from "node:fs/promises";

const pdf = await readFile("invoice-1042.pdf");

await fetch("https://stackemails.com/v1/emails", {
  method: "POST",
  headers: { Authorization: \`Bearer \${process.env.STACKEMAILS_API_KEY}\`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "Acme Billing <billing@mail.acme.com>",
    to: "ada@example.com",
    subject: "Invoice INV-1042",
    html: "<p>Your invoice is attached.</p>",
    attachments: [{ filename: "invoice-1042.pdf", content: pdf.toString("base64") }],
  }),
});
\`\`\`

## Python

\`\`\`python
import base64, os, requests

with open("invoice-1042.pdf", "rb") as f:
    content = base64.b64encode(f.read()).decode()

requests.post(
    "https://stackemails.com/v1/emails",
    headers={"Authorization": f"Bearer {os.environ['STACKEMAILS_API_KEY']}"},
    json={
        "from": "Acme Billing <billing@mail.acme.com>",
        "to": "ada@example.com",
        "subject": "Invoice INV-1042",
        "html": "<p>Your invoice is attached.</p>",
        "attachments": [{"filename": "invoice-1042.pdf", "content": content}],
    },
    timeout=15,
).raise_for_status()
\`\`\`

## PHP

\`\`\`php
$payload = [
    "from" => "Acme Billing <billing@mail.acme.com>",
    "to" => "ada@example.com",
    "subject" => "Invoice INV-1042",
    "html" => "<p>Your invoice is attached.</p>",
    "attachments" => [[
        "filename" => "invoice-1042.pdf",
        "content" => base64_encode(file_get_contents("invoice-1042.pdf")),
    ]],
];
// POST $payload as JSON to https://stackemails.com/v1/emails (see the PHP guide)
\`\`\`

Full request code: [Node.js](/send-email/nodejs), [Python](/send-email/python), [PHP](/send-email/php).

## cURL

\`\`\`bash
CONTENT=$(base64 -w0 report.csv)   # on macOS: base64 -i report.csv

curl -X POST https://stackemails.com/v1/emails \\
  -H "Authorization: Bearer $STACKEMAILS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d "{\\"from\\":\\"reports@mail.acme.com\\",\\"to\\":\\"ada@example.com\\",\\"subject\\":\\"Daily report\\",\\"text\\":\\"Attached.\\",\\"attachments\\":[{\\"filename\\":\\"report.csv\\",\\"content\\":\\"$CONTENT\\"}]}"
\`\`\`

## Size limits and why they matter

Base64 makes files about **33% larger**, and most receiving servers cap total message size somewhere between 10 and 35 MB (Gmail accepts up to 25 MB when receiving). Large attachments also slow delivery and can trigger spam filtering.

For anything big, **send a link instead**: upload the file to storage, generate a signed URL that expires, and put the link in the email.

## Deliverability tips for attachments

- Stick to common, expected types: PDF, PNG, JPG, CSV, ICS. Executables, scripts and macro-enabled Office files are blocked or quarantined by most providers.
- Name files clearly (\`invoice-1042.pdf\`, not \`file.pdf\`).
- Always include body text explaining the attachment; an empty body with a file looks like malware.
- Authenticate your domain with [SPF](/tools/spf-checker), [DKIM](/tools/dkim-checker) and [DMARC](/tools/dmarc-checker).

Need a starting point? Use the free [invoice](/email-templates/invoice) and [payment receipt](/email-templates/payment-receipt) email templates.`,
  },
];
