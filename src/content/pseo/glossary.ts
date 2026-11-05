/**
 * /glossary/[slug]: short, accurate definitions of email terms. Each entry
 * links to the tools, guides and docs that go deeper (internal linking hub).
 */
export type Term = {
  slug: string;
  term: string;
  /** Short name used in "What is X?" (defaults to term). */
  short?: string;
  category: "Authentication" | "Deliverability" | "Infrastructure" | "Sending";
  definition: string; // one or two sentences, used as meta description + lead
  body: string; // Markdown
  related: string[]; // other glossary slugs
  links?: { href: string; label: string }[];
};

export const GLOSSARY: Term[] = [
  {
    slug: "spf",
    term: "SPF (Sender Policy Framework)",
    short: "SPF",
    category: "Authentication",
    definition: "SPF (Sender Policy Framework) is a DNS TXT record that lists the servers allowed to send email for a domain, so receiving servers can reject mail from anywhere else.",
    body: `## How SPF works

When a server receives a message, it looks up the SPF record of the domain in the message's **return path** (the envelope sender, also called \`MAIL FROM\`). If the sending server's IP address matches one of the mechanisms in the record, SPF passes.

An SPF record is a single TXT record at the domain:

\`\`\`
v=spf1 include:_spf.google.com include:amazonses.com ~all
\`\`\`

- \`v=spf1\` marks it as SPF.
- \`include:\` authorises another domain's senders (for example Google Workspace or Amazon SES).
- \`ip4:\` / \`ip6:\` authorise specific addresses.
- \`~all\` (soft fail) or \`-all\` (hard fail) says what to do with everything else.

## Common SPF mistakes

- **More than one SPF record.** A domain must have exactly one \`v=spf1\` record; two records cause a \`permerror\`.
- **More than 10 DNS lookups.** Each \`include\`, \`a\`, \`mx\`, \`ptr\`, \`exists\` and \`redirect\` counts. Going over 10 makes SPF fail.
- **Forgetting a sender.** Every service that sends as your domain (helpdesk, CRM, newsletter tool) needs to be included.

## SPF and DMARC

SPF alone doesn't protect the visible From address. [DMARC](/glossary/dmarc) requires SPF (or DKIM) to pass **and align** with the From domain.`,
    related: ["dkim", "dmarc", "return-path", "dmarc-alignment"],
    links: [{ href: "/tools/spf-checker", label: "Check your SPF record" }, { href: "/tools/spf-generator", label: "Generate an SPF record" }, { href: "/blog/spf-dkim-dmarc-setup-guide", label: "SPF, DKIM and DMARC setup guide" }],
  },
  {
    slug: "dkim",
    term: "DKIM (DomainKeys Identified Mail)",
    short: "DKIM",
    category: "Authentication",
    definition: "DKIM (DomainKeys Identified Mail) adds a cryptographic signature to each email, and publishes the matching public key in DNS, so receivers can verify the message came from the domain and wasn't changed.",
    body: `## How DKIM works

1. The sending server signs selected headers and the body with a **private key** and adds a \`DKIM-Signature\` header.
2. The header names the signing domain (\`d=\`) and a **selector** (\`s=\`).
3. The receiver fetches the public key from \`<selector>._domainkey.<domain>\` in DNS and verifies the signature.

A DKIM DNS record looks like this:

\`\`\`
s1._domainkey.mail.acme.com  TXT  "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
\`\`\`

Many providers publish DKIM as CNAME records that point to keys they rotate for you.

## Key length

Use **2048-bit** RSA keys where your DNS provider supports long TXT records. 1024-bit keys still validate but are considered weak.

## DKIM and DMARC

For [DMARC](/glossary/dmarc), the DKIM signing domain (\`d=\`) must align with the From domain. Signing with your email provider's domain instead of yours passes DKIM but fails DMARC alignment.`,
    related: ["spf", "dmarc", "dmarc-alignment", "bimi"],
    links: [{ href: "/tools/dkim-checker", label: "Check a DKIM record" }, { href: "/blog/spf-dkim-dmarc-setup-guide", label: "SPF, DKIM and DMARC setup guide" }],
  },
  {
    slug: "dmarc",
    term: "DMARC",
    category: "Authentication",
    definition: "DMARC (Domain-based Message Authentication, Reporting and Conformance) is a DNS policy that tells receivers what to do with mail that fails SPF and DKIM alignment, and where to send reports.",
    body: `## What DMARC does

DMARC ties [SPF](/glossary/spf) and [DKIM](/glossary/dkim) to the address people actually see, the **From** header. A message passes DMARC when SPF or DKIM passes **and** the authenticated domain aligns with the From domain.

The record lives at \`_dmarc.<domain>\`:

\`\`\`
_dmarc.acme.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@acme.com; adkim=s; aspf=r"
\`\`\`

| Tag | Meaning |
| --- | --- |
| \`p\` | Policy: \`none\` (monitor), \`quarantine\` (spam folder) or \`reject\` |
| \`rua\` | Where to send daily aggregate reports |
| \`pct\` | Percentage of failing mail the policy applies to |
| \`sp\` | Policy for subdomains |
| \`adkim\` / \`aspf\` | Alignment mode: \`r\` relaxed or \`s\` strict |

## Rolling out DMARC

1. Start with \`p=none\` and a \`rua\` address to collect reports.
2. Fix every legitimate source that fails (usually a tool sending without your DKIM).
3. Move to \`p=quarantine\`, then \`p=reject\`.

Gmail and Yahoo require a DMARC record (at least \`p=none\`) from bulk senders.`,
    related: ["dmarc-alignment", "spf", "dkim", "bimi"],
    links: [{ href: "/tools/dmarc-checker", label: "Check your DMARC record" }, { href: "/tools/dmarc-generator", label: "Generate a DMARC record" }, { href: "/blog/gmail-yahoo-bulk-sender-requirements", label: "Gmail and Yahoo sender requirements" }],
  },
  {
    slug: "dmarc-alignment",
    term: "DMARC alignment",
    category: "Authentication",
    definition: "DMARC alignment means the domain authenticated by SPF or DKIM matches the domain in the visible From address, either exactly (strict) or at the organisational-domain level (relaxed).",
    body: `## SPF alignment

SPF authenticates the **return path** domain. It aligns when that domain matches the From domain. With relaxed alignment (\`aspf=r\`, the default), \`bounces.mail.acme.com\` aligns with \`acme.com\`.

## DKIM alignment

DKIM authenticates the \`d=\` domain in the signature. It aligns when \`d=\` matches the From domain (\`adkim=r\` relaxed allows subdomains).

## Why mail passes SPF but fails DMARC

A common case: your newsletter tool sends with its own return path and signs with its own DKIM domain. SPF and DKIM both pass, but neither aligns with \`acme.com\`, so DMARC fails. Fix it by setting up a custom return path and DKIM for your domain in that tool. Stack Emails configures both for every domain you add.`,
    related: ["dmarc", "spf", "dkim", "return-path"],
    links: [{ href: "/tools/dmarc-checker", label: "DMARC checker" }],
  },
  {
    slug: "bimi",
    term: "BIMI",
    category: "Authentication",
    definition: "BIMI (Brand Indicators for Message Identification) lets a domain show its logo next to authenticated emails in supporting inboxes, once DMARC is enforced.",
    body: `## Requirements

- DMARC at enforcement: \`p=quarantine\` or \`p=reject\` (with \`pct=100\`).
- A square logo in SVG Tiny Portable/Secure format.
- For Gmail and Apple Mail, a **Verified Mark Certificate (VMC)** or Common Mark Certificate from an authorised certificate authority.

## The record

\`\`\`
default._bimi.acme.com  TXT  "v=BIMI1; l=https://acme.com/logo.svg; a=https://acme.com/vmc.pem"
\`\`\`

BIMI is a reward for strong authentication, not a deliverability fix by itself.`,
    related: ["dmarc", "dkim", "spf"],
  },
  {
    slug: "mx-record",
    term: "MX record",
    category: "Infrastructure",
    definition: "An MX (mail exchanger) record is a DNS record that tells other servers which mail servers accept email for a domain, in priority order.",
    body: `## Example

\`\`\`
acme.com.  MX  10 mx1.mailhost.com.
acme.com.  MX  20 mx2.mailhost.com.
\`\`\`

Lower numbers have higher priority; senders try \`mx1\` first and fall back to \`mx2\`.

## MX records and sending

MX records are about **receiving**. You don't need them to send, but some providers use an MX record on the return-path subdomain to receive bounces. Stack Emails adds one on \`send.<your-domain>\` for bounce handling, and on your inbound subdomain if you [receive email](/features/inbound-email).`,
    related: ["spf", "return-path", "smtp"],
    links: [{ href: "/tools/mx-lookup", label: "Look up MX records" }],
  },
  {
    slug: "smtp",
    term: "SMTP",
    category: "Infrastructure",
    definition: "SMTP (Simple Mail Transfer Protocol) is the standard protocol for sending email between mail clients, applications and mail servers.",
    body: `## How SMTP works

An SMTP client connects to a server, introduces itself (\`EHLO\`), optionally upgrades to TLS ([STARTTLS](/glossary/starttls)), authenticates, then sends the envelope (\`MAIL FROM\`, \`RCPT TO\`) and the message (\`DATA\`).

\`\`\`
EHLO app.acme.com
STARTTLS
AUTH PLAIN ...
MAIL FROM:<bounces@send.acme.com>
RCPT TO:<ada@example.com>
DATA
Subject: Your login code
...
.
QUIT
\`\`\`

## SMTP vs an email API

SMTP works with almost any language, CMS or device. An HTTP email API is usually faster to integrate in code, returns a message ID immediately and isn't affected by blocked SMTP ports. Stack Emails supports both: the [REST API](/docs/quickstart) and the [SMTP relay](/docs/smtp).`,
    related: ["smtp-relay", "starttls", "mx-record"],
    links: [{ href: "/smtp-settings", label: "SMTP settings for 25+ providers" }, { href: "/blog/smtp-ports-25-465-587-2525", label: "SMTP ports explained" }],
  },
  {
    slug: "smtp-relay",
    term: "SMTP relay",
    category: "Infrastructure",
    definition: "An SMTP relay is a service that accepts email from your application or device over SMTP and delivers it to recipients on your behalf, handling reputation, retries and authentication.",
    body: `## Why use an SMTP relay

- Your servers don't need their own IP reputation or port 25 access.
- Mail is signed with [DKIM](/glossary/dkim) for your domain and retried on temporary failures.
- You get logs, bounce handling and suppression in one place.

## Setting one up

Point your app at the relay's host and port and use the credentials it gives you. For Stack Emails that is \`smtp.stackemails.com\`, port 465 or 587, username \`stackemails\` and an API key as the password. See [Stack Emails SMTP settings](/smtp-settings/stack-emails).`,
    related: ["smtp", "starttls", "transactional-email"],
    links: [{ href: "/features/smtp-relay", label: "Stack Emails SMTP relay" }, { href: "/blog/free-smtp-servers", label: "Free SMTP servers compared" }],
  },
  {
    slug: "starttls",
    term: "STARTTLS",
    category: "Infrastructure",
    definition: "STARTTLS is an SMTP command that upgrades a plain-text connection to an encrypted TLS connection, used on ports 587 and 25.",
    body: `## STARTTLS vs implicit TLS

- **STARTTLS (port 587):** the connection starts in plain text and the client sends \`STARTTLS\` to switch to TLS before authenticating.
- **Implicit TLS (port 465):** TLS starts immediately, before any SMTP command.

Both are secure when the client requires TLS. In most libraries, port 587 means \`secure: false\` (STARTTLS) and port 465 means \`secure: true\`.

## Opportunistic vs enforced

Between servers, STARTTLS is usually opportunistic: if the receiver doesn't support it, mail goes unencrypted. MTA-STS and DANE let domains require TLS. Stack Emails lets you choose opportunistic or enforced TLS per domain.`,
    related: ["smtp", "smtp-relay"],
    links: [{ href: "/blog/smtp-ports-25-465-587-2525", label: "SMTP ports explained" }],
  },
  {
    slug: "return-path",
    term: "Return path",
    category: "Infrastructure",
    definition: "The return path (envelope sender or MAIL FROM) is the address that bounces are sent to. It is separate from the visible From address and is the domain SPF checks.",
    body: `## Where it appears

Receivers record it in a \`Return-Path:\` header. It is often a subdomain such as \`bounces@send.acme.com\` so that bounces go to the email service rather than a person's inbox.

## Custom return paths

Using a return path on your own domain lets [SPF](/glossary/spf) align with your From domain for [DMARC](/glossary/dmarc-alignment). Stack Emails sets up \`send.<your-domain>\` with SPF and an MX record for bounces automatically.`,
    related: ["spf", "dmarc-alignment", "hard-bounce"],
  },
  {
    slug: "transactional-email",
    term: "Transactional email",
    category: "Sending",
    definition: "Transactional email is a message sent to one person in response to something they did or that happened to their account, such as a password reset, receipt or login code.",
    body: `## Examples

- Password resets and magic links
- Email verification and one-time codes
- Order confirmations, receipts and invoices
- Shipping and account notifications

## How it differs from marketing email

Transactional email is expected, time-sensitive and usually doesn't need an unsubscribe link, because it relates to an action the recipient took. Marketing email goes to many people at once and must be opted into. Keep the two on separate subdomains so a marketing campaign can't hurt your password-reset delivery. See [transactional vs marketing email](/blog/transactional-vs-marketing-email).`,
    related: ["marketing-email", "smtp-relay", "email-deliverability"],
    links: [{ href: "/blog/what-is-transactional-email", label: "What is transactional email? Examples and best practices" }, { href: "/email-templates", label: "Transactional email templates" }],
  },
  {
    slug: "marketing-email",
    term: "Marketing email",
    category: "Sending",
    definition: "Marketing email is a message sent to many subscribers at once to promote, inform or engage, such as newsletters, product updates and offers. It requires consent and an unsubscribe link.",
    body: `## Rules that apply

- Recipients must have opted in.
- Include your postal address and a working unsubscribe link.
- Gmail and Yahoo require **one-click unsubscribe** (\`List-Unsubscribe\` and \`List-Unsubscribe-Post\` headers) for bulk senders.

Stack Emails [broadcasts](/features/marketing-email) add one-click unsubscribe automatically and respect each contact's topic preferences.`,
    related: ["transactional-email", "list-unsubscribe", "double-opt-in"],
  },
  {
    slug: "email-deliverability",
    term: "Email deliverability",
    category: "Deliverability",
    definition: "Email deliverability is the ability to get messages into recipients' inboxes rather than spam folders or rejected, driven by authentication, sender reputation and engagement.",
    body: `## What affects it

1. **Authentication:** [SPF](/glossary/spf), [DKIM](/glossary/dkim) and [DMARC](/glossary/dmarc).
2. **Reputation:** your domain's and IP's history of complaints and bounces.
3. **List quality:** sending only to people who want your mail.
4. **Content and consistency:** predictable volume, clear sender name, no misleading subjects.

Delivery (the receiving server accepted the message) is not the same as deliverability (it reached the inbox).`,
    related: ["sender-reputation", "bounce-rate", "spam-complaint-rate"],
    links: [{ href: "/blog/email-deliverability-guide", label: "The developer's guide to email deliverability" }],
  },
  {
    slug: "sender-reputation",
    term: "Sender reputation",
    category: "Deliverability",
    definition: "Sender reputation is the score mailbox providers keep for your sending domain and IP addresses, based on complaints, bounces, spam traps and engagement. It decides whether your mail reaches the inbox.",
    body: `## How to protect it

- Keep [spam complaints](/glossary/spam-complaint-rate) under 0.1% and [bounces](/glossary/bounce-rate) under 2%.
- Separate transactional and marketing mail onto different subdomains.
- Increase volume gradually on new domains and IPs ([warm-up](/glossary/ip-warming)).
- Check Google Postmaster Tools for your domain's reputation at Gmail.`,
    related: ["email-deliverability", "ip-warming", "dedicated-ip"],
  },
  {
    slug: "bounce-rate",
    term: "Bounce rate",
    category: "Deliverability",
    definition: "Bounce rate is the percentage of sent emails that were returned as undeliverable. Keep hard bounces under 2% to protect your sender reputation.",
    body: `## Hard vs soft bounces

- A [hard bounce](/glossary/hard-bounce) is permanent: the address doesn't exist. Never send to it again.
- A [soft bounce](/glossary/soft-bounce) is temporary: a full mailbox or a server that's briefly unavailable.

Stack Emails adds hard-bounced addresses to your [suppression list](/glossary/suppression-list) automatically.`,
    related: ["hard-bounce", "soft-bounce", "suppression-list"],
    links: [{ href: "/blog/reduce-email-bounce-rate", label: "How to reduce your email bounce rate" }],
  },
  {
    slug: "hard-bounce",
    term: "Hard bounce",
    category: "Deliverability",
    definition: "A hard bounce is a permanent delivery failure, usually because the address or domain doesn't exist. Retrying a hard bounce damages your sender reputation.",
    body: `Typical SMTP responses are \`550 5.1.1 User unknown\` or a domain with no mail server. Remove the address immediately; good providers do this for you with a [suppression list](/glossary/suppression-list).`,
    related: ["soft-bounce", "bounce-rate", "suppression-list"],
  },
  {
    slug: "soft-bounce",
    term: "Soft bounce",
    category: "Deliverability",
    definition: "A soft bounce is a temporary delivery failure, such as a full mailbox or a receiving server that is busy. The sending service retries it for a while before giving up.",
    body: `Responses in the \`4xx\` range (for example \`421\` or \`452\`) are temporary. Repeated soft bounces to the same address for days are a sign to stop sending to it.`,
    related: ["hard-bounce", "bounce-rate"],
  },
  {
    slug: "suppression-list",
    term: "Suppression list",
    category: "Deliverability",
    definition: "A suppression list is a list of addresses your email service won't send to, usually because they hard-bounced, complained or unsubscribed.",
    body: `Suppression protects your reputation automatically: a second send to a dead address or a complainer is never attempted. In Stack Emails you can view, export and remove entries under **Emails > Suppressions**.`,
    related: ["hard-bounce", "spam-complaint-rate", "list-unsubscribe"],
  },
  {
    slug: "spam-complaint-rate",
    term: "Spam complaint rate",
    category: "Deliverability",
    definition: "Spam complaint rate is the share of delivered emails that recipients marked as spam. Gmail asks senders to stay below 0.1% and never reach 0.3%.",
    body: `Complaints are reported back to senders through feedback loops. They are the strongest negative signal for [sender reputation](/glossary/sender-reputation). Make unsubscribing easy, only email people who opted in, and send what they signed up for.`,
    related: ["sender-reputation", "list-unsubscribe", "double-opt-in"],
    links: [{ href: "/blog/gmail-yahoo-bulk-sender-requirements", label: "Gmail and Yahoo sender requirements" }],
  },
  {
    slug: "list-unsubscribe",
    term: "List-Unsubscribe header",
    short: "List-Unsubscribe",
    category: "Sending",
    definition: "List-Unsubscribe is an email header that lets inboxes show an unsubscribe button. With List-Unsubscribe-Post (RFC 8058) it supports one-click unsubscribe, which Gmail and Yahoo require from bulk senders.",
    body: `\`\`\`
List-Unsubscribe: <https://acme.com/u/abc123>, <mailto:unsub@acme.com>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
\`\`\`

The inbox sends a POST to the URL; your server must unsubscribe the recipient without further confirmation. Stack Emails adds both headers to every broadcast.`,
    related: ["marketing-email", "spam-complaint-rate"],
  },
  {
    slug: "double-opt-in",
    term: "Double opt-in",
    category: "Sending",
    definition: "Double opt-in means a new subscriber confirms their address by clicking a link in a confirmation email before they're added to a mailing list.",
    body: `It proves the address is real and owned by the person who signed up, which keeps bounces, spam traps and complaints down. It costs a few sign-ups but improves list quality.`,
    related: ["marketing-email", "spam-trap"],
  },
  {
    slug: "spam-trap",
    term: "Spam trap",
    category: "Deliverability",
    definition: "A spam trap is an email address used by mailbox providers and blocklists to catch senders who mail addresses that never opted in, such as scraped, purchased or long-abandoned addresses.",
    body: `Hitting spam traps can get your domain or IP onto a [blocklist](/glossary/blocklist). The cure is list hygiene: confirmed opt-in, removing inactive contacts and never buying lists.`,
    related: ["blocklist", "double-opt-in", "sender-reputation"],
  },
  {
    slug: "blocklist",
    term: "Email blocklist",
    short: "an email blocklist",
    category: "Deliverability",
    definition: "An email blocklist (blacklist) is a list of IP addresses or domains known for sending spam. Receiving servers consult them and may reject or filter mail from listed senders.",
    body: `Well-known lists include Spamhaus and Barracuda. If you're listed, find and fix the cause (a compromised account, a bad list, missing authentication) before requesting removal.`,
    related: ["spam-trap", "sender-reputation"],
  },
  {
    slug: "ip-warming",
    term: "IP warming",
    category: "Deliverability",
    definition: "IP warming is gradually increasing the volume of email sent from a new IP address or domain so mailbox providers can build a positive reputation for it.",
    body: `Start with your most engaged recipients and roughly double daily volume while bounce and complaint rates stay low. Shared IP pools, which Stack Emails uses by default, are already warm.`,
    related: ["dedicated-ip", "sender-reputation"],
  },
  {
    slug: "dedicated-ip",
    term: "Dedicated IP",
    short: "a dedicated IP",
    category: "Deliverability",
    definition: "A dedicated IP is a sending IP address used by only one sender, so its reputation depends entirely on that sender's mail. It suits high, steady volumes.",
    body: `Below roughly 100,000 emails a month, a well-managed shared pool usually delivers better than a dedicated IP, because a quiet dedicated IP never builds enough reputation.`,
    related: ["ip-warming", "sender-reputation"],
  },
  {
    slug: "email-webhook",
    term: "Email webhook",
    short: "an email webhook",
    category: "Sending",
    definition: "An email webhook is an HTTP callback your email service sends to your server when something happens to a message, such as delivered, bounced, opened, clicked or marked as spam.",
    body: `Webhooks let your app react in real time: mark an address invalid after a bounce, or show "delivered" in a support tool. Verify the signature on every request. See the [email webhooks guide](/blog/email-webhooks-guide) and [Stack Emails webhooks](/docs/webhooks).`,
    related: ["transactional-email", "hard-bounce"],
  },
  {
    slug: "idempotency-key",
    term: "Idempotency key",
    short: "an idempotency key",
    category: "Sending",
    definition: "An idempotency key is a unique value sent with an API request so that retries of the same request are processed only once, preventing duplicate emails.",
    body: `If a network error hides whether your send succeeded, retry with the same key and the API returns the original result instead of sending again. See [idempotency in the Stack Emails API](/docs/idempotency).`,
    related: ["email-webhook", "transactional-email"],
  },
];

export const termBySlug = (slug: string) => GLOSSARY.find((t) => t.slug === slug);
