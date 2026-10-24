/**
 * Launch articles for the public blog. `npm run migrate` inserts any that are
 * missing (by slug) into the BlogPost collection, after which they are fully
 * editable from Admin → Blog. They are also the fallback when the database is
 * unreachable at build time, so the blog never renders empty.
 */
export type SeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  content: string;
};

export const SEED_POSTS: SeedPost[] = [
  {
    slug: "email-deliverability-guide",
    title: "The developer's guide to email deliverability",
    excerpt: "Why perfectly valid emails still land in spam, and the eight things that actually move inbox placement, from authentication to list hygiene.",
    category: "Deliverability",
    tags: ["deliverability", "dkim", "spf", "dmarc", "best-practices"],
    publishedAt: "2026-09-02T09:00:00.000Z",
    featured: true,
    seoTitle: "Email deliverability guide for developers (2026)",
    seoDescription: "A practical, no-fluff guide to email deliverability: authentication, sender reputation, bounce and complaint rates, list hygiene and content, with checklists.",
    content: `Sending an email is easy. Getting it into the inbox is the hard part. An API can return \`200 OK\` while Gmail quietly files your password reset under *Promotions*: or worse, *Spam*. This guide covers what inbox providers actually look at, in the order it matters.

## 1. Authenticate every domain you send from

Mailbox providers will not trust mail they cannot attribute to you. Three DNS records do the attributing:

- **SPF** lists the servers allowed to send for your domain's return path.
- **DKIM** adds a cryptographic signature that proves the message was not altered and was sent by the domain owner.
- **DMARC** tells receivers what to do when SPF or DKIM fail, and asks them to send you reports.

Since February 2024, Gmail and Yahoo **require** SPF, DKIM and a DMARC record for anyone sending more than 5,000 messages a day to their users, and they reject unauthenticated mail far more aggressively for everyone else. Stack Emails generates all three records when you add a domain; see the [SPF, DKIM and DMARC setup guide](/blog/spf-dkim-dmarc-setup-guide) for a walkthrough.

## 2. Align your From domain

Authentication only counts for DMARC when it *aligns* with the domain in the visible \`From:\` header. If you send as \`hello@acme.com\`, the DKIM signature should be for \`acme.com\` and the return path should be a subdomain like \`send.acme.com\`. Stack Emails sets up both by default.

## 3. Keep bounce rates under 2%

A hard bounce means the address does not exist. A few are normal; many signal that you are mailing a purchased or stale list. Amazon SES, which powers Stack Emails, reviews accounts whose bounce rate rises above 5% and may pause sending above 10%.

What helps:

1. Validate addresses at signup (and consider double opt-in for marketing lists).
2. Never retry a hard bounce. Stack Emails adds hard-bounced addresses to your suppression list automatically.
3. Remove contacts that have not engaged in 6–12 months.

## 4. Keep complaint rates under 0.1%

A complaint is a recipient pressing *Report spam*. Gmail's published threshold is a spam rate below **0.3%**, and it recommends staying under **0.1%**. Complaints are the single strongest negative signal there is.

The fastest way to reduce complaints is to make unsubscribing easier than reporting spam. That means a visible unsubscribe link *and* the \`List-Unsubscribe\` / \`List-Unsubscribe-Post\` headers that enable one-click unsubscribe in Gmail and Apple Mail. Stack Emails adds both to every broadcast.

## 5. Separate transactional and marketing traffic

Receipts and login codes should never share a reputation with your newsletter. Use a different subdomain, for example \`mail.acme.com\` for product email and \`news.acme.com\` for campaigns, so a bad campaign cannot delay a password reset. Read more in [transactional vs marketing email](/blog/transactional-vs-marketing-email).

## 6. Warm up new domains

A brand-new domain has no reputation. Start with your most engaged recipients and grow volume over two to four weeks rather than sending 100,000 messages on day one.

## 7. Write like a person

Content filters matter less than they used to, but these still help:

- Always include a plain-text part alongside HTML.
- Avoid link shorteners and mismatched link text.
- Keep image-to-text ratio reasonable; never send a single-image email.
- Use a real reply-to address.

## 8. Monitor, don't guess

Watch delivery, bounce and complaint rates per domain, and register your domain with [Google Postmaster Tools](https://postmaster.google.com/). The Stack Emails dashboard shows bounce and complaint rates against these thresholds on the Metrics page.

## Checklist

| Item | Target |
| --- | --- |
| SPF, DKIM, DMARC | All passing and aligned |
| Hard bounce rate | Under 2% |
| Spam complaint rate | Under 0.1% |
| One-click unsubscribe | On all marketing email |
| Separate subdomains | Transactional vs marketing |

Deliverability is not a setting you switch on. It is the sum of many small habits. Get the foundations right and the inbox follows.`,
  },
  {
    slug: "spf-dkim-dmarc-setup-guide",
    title: "SPF, DKIM and DMARC explained, and how to set them up",
    excerpt: "What each email authentication record does, how they work together, and a step-by-step setup for any DNS provider.",
    category: "Deliverability",
    tags: ["dkim", "spf", "dmarc", "dns", "domains"],
    publishedAt: "2026-09-09T09:00:00.000Z",
    seoTitle: "SPF, DKIM and DMARC setup guide (step by step)",
    seoDescription: "Learn what SPF, DKIM and DMARC do and how to add the DNS records for your sending domain, with examples for Cloudflare, Hostinger, GoDaddy and Route 53.",
    content: `Email was designed in an era when everyone on the network trusted each other. SPF, DKIM and DMARC are the three standards that bolt identity on after the fact. You need all three.

## SPF: who may send

**Sender Policy Framework** is a TXT record listing the servers allowed to send mail for a domain. Receivers check it against the *envelope sender* (the return path), not the visible From address.

\`\`\`
send.acme.com  TXT  "v=spf1 include:amazonses.com ~all"
\`\`\`

A domain can only have **one** SPF record, and SPF evaluation may perform at most **10 DNS lookups**. If you use several providers, merge them into a single record.

## DKIM: proof the message is genuine

**DomainKeys Identified Mail** signs each message with a private key; receivers fetch the public key from DNS to verify it. A valid signature proves the content was not changed in transit and that the domain owner authorised it.

Stack Emails uses Easy DKIM with 2048-bit keys, published as three CNAME records so keys can be rotated without you touching DNS again:

\`\`\`
abc123._domainkey.acme.com  CNAME  abc123.dkim.amazonses.com
\`\`\`

## DMARC: the policy

**Domain-based Message Authentication, Reporting and Conformance** ties the two together. It tells receivers what to do with mail that fails *aligned* SPF or DKIM, and where to send aggregate reports.

\`\`\`
_dmarc.acme.com  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@acme.com"
\`\`\`

Start with \`p=none\` to collect reports without affecting delivery. Once every legitimate source passes, move to \`p=quarantine\` and eventually \`p=reject\`.

## Setting it up with Stack Emails

1. In the dashboard, open **Domains > Add domain** and enter the domain (a subdomain like \`mail.acme.com\` is recommended).
2. Copy the generated records: three DKIM CNAMEs, an MX and SPF TXT record for the custom return path, and a DMARC TXT record.
3. Add them at your DNS provider. For **Cloudflare**, set CNAMEs to *DNS only* (grey cloud). For **Hostinger** and **GoDaddy**, enter only the host part (e.g. \`abc123._domainkey\`). The panel appends your domain. In **Route 53**, paste the full name.
4. Click **Verify**. Most providers propagate within minutes; some take up to 72 hours. Stack Emails also re-checks pending domains automatically every 10 minutes.

## Common mistakes

- **Two SPF records.** Merge them; receivers treat duplicates as a permanent error.
- **Proxying DKIM CNAMEs** through a CDN. They must resolve directly.
- **Doubling the domain**: entering \`abc._domainkey.acme.com\` in a panel that appends \`.acme.com\` produces \`abc._domainkey.acme.com.acme.com\`.
- **Jumping straight to \`p=reject\`** before checking reports, which can block your own invoices sent from another tool.

## How to check your records

From a terminal:

\`\`\`bash
dig +short TXT _dmarc.acme.com
dig +short CNAME abc123._domainkey.acme.com
\`\`\`

Or send yourself a test email in Gmail and choose **Show original**: you should see \`SPF: PASS\`, \`DKIM: PASS\` and \`DMARC: PASS\`.

With all three passing and aligned you have done the single most important thing for [deliverability](/blog/email-deliverability-guide).`,
  },
  {
    slug: "gmail-yahoo-bulk-sender-requirements",
    title: "Gmail and Yahoo sender requirements: what changed and how to comply",
    excerpt: "Authentication, one-click unsubscribe and a spam-rate ceiling are now mandatory for bulk senders. Here is exactly what is required.",
    category: "Deliverability",
    tags: ["gmail", "yahoo", "deliverability", "unsubscribe", "compliance"],
    publishedAt: "2026-09-16T09:00:00.000Z",
    seoTitle: "Gmail & Yahoo bulk sender requirements explained",
    seoDescription: "The Gmail and Yahoo email sender requirements in plain English: SPF, DKIM, DMARC, one-click unsubscribe (RFC 8058) and the 0.3% spam rate threshold.",
    content: `In February 2024 Google and Yahoo started enforcing new rules for anyone sending email to their users. Microsoft followed with similar requirements for Outlook.com in 2025. If you send at volume and ignore them, your mail gets throttled or rejected.

## Requirements for all senders

Every sender, regardless of volume, must:

- Authenticate with **SPF or DKIM**.
- Have valid forward and reverse DNS for sending IPs (handled by your provider).
- Use **TLS** for transmission.
- Keep the **spam rate reported in Postmaster Tools below 0.3%**.
- Format messages according to RFC 5322.
- Not impersonate Gmail \`From:\` headers.

## Additional requirements for bulk senders

Google defines a bulk sender as anyone who has sent close to **5,000 or more messages to Gmail accounts in a single day**. Once you cross that line, the status is permanent. Bulk senders must also:

1. Authenticate with **both SPF and DKIM**.
2. Publish a **DMARC** record (a policy of \`p=none\` is enough).
3. **Align** the From domain with either the SPF or the DKIM domain.
4. Support **one-click unsubscribe** for marketing and subscribed messages, and honour requests within two days.

## One-click unsubscribe, precisely

One-click unsubscribe is defined in **RFC 8058**. It requires two headers:

\`\`\`
List-Unsubscribe: <https://acme.com/u/abc123>, <mailto:unsubscribe@acme.com>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
\`\`\`

The mail client sends a \`POST\` to the HTTPS URL; your server must unsubscribe the recipient without requiring login or further confirmation. A visible link in the footer is still required as well.

Stack Emails adds both headers to every broadcast automatically, hosts the unsubscribe endpoint, and records the opt-out against the contact (or the specific topic they unsubscribed from).

## Transactional email is exempt (mostly)

Password resets, receipts and security alerts do not need one-click unsubscribe. They still need authentication and still count towards your spam rate, so keep them on a separate subdomain from marketing traffic.

## Compliance checklist

- [x] SPF and DKIM passing
- [x] DMARC record published
- [x] From domain aligned
- [x] RFC 8058 one-click unsubscribe on marketing email
- [x] Spam rate under 0.3% (aim for 0.1%)

Every item on that list is handled by default when you send broadcasts through a verified Stack Emails domain. For the full picture, read the [deliverability guide](/blog/email-deliverability-guide).`,
  },
  {
    slug: "transactional-vs-marketing-email",
    title: "Transactional vs marketing email: why you should keep them apart",
    excerpt: "Receipts and newsletters follow different laws, have different expectations, and should never share a sender reputation.",
    category: "Guides",
    tags: ["transactional-email", "marketing-email", "best-practices"],
    publishedAt: "2026-09-23T09:00:00.000Z",
    content: `Not all email is equal. A password reset that arrives five minutes late is a support ticket; a newsletter that arrives five minutes late is nothing. Treating them the same is one of the most common mistakes product teams make.

## What counts as transactional

Transactional (or *product*) email is triggered by something the user did, and contains information they need:

- Sign-up confirmations and magic links
- Password resets and one-time codes
- Receipts, invoices and shipping notices
- Security alerts and account changes

Under laws like CAN-SPAM, purely transactional messages do not require an unsubscribe link, because the recipient needs them.

## What counts as marketing

Marketing (or *broadcast*) email promotes something: product updates, newsletters, offers, onboarding drip campaigns. It requires consent under GDPR in the EU and a working unsubscribe mechanism almost everywhere. Since 2024, Gmail and Yahoo also require [one-click unsubscribe](/blog/gmail-yahoo-bulk-sender-requirements) for it.

## Why they need separate reputations

Inbox providers build a reputation for every sending domain. Marketing email naturally generates more complaints and lower engagement than receipts do. If both share a domain, a single badly targeted campaign can push your password resets into spam.

The fix is simple: send from different subdomains.

| Stream | Example From | Domain |
| --- | --- | --- |
| Transactional | \`Acme <no-reply@mail.acme.com>\` | mail.acme.com |
| Marketing | \`Acme News <news@news.acme.com>\` | news.acme.com |

## How Stack Emails handles both

- Use the **Emails API** for transactional mail: it is optimised for speed and supports idempotency keys, scheduling and attachments.
- Use **Broadcasts** for marketing: send to a segment, filter by topic, personalise with merge tags, and get unsubscribe headers and a hosted preference page for free.
- Add each subdomain separately under **Domains** so they get their own DKIM keys and reputation.
- Scope API keys to a single domain so a compromised marketing key cannot send password resets.

Keeping the two streams apart costs you ten minutes of DNS setup and protects the emails your users rely on most.`,
  },
  {
    slug: "send-email-nextjs",
    title: "How to send email from Next.js (App Router) in 5 minutes",
    excerpt: "Send transactional email from a Next.js Server Action or Route Handler with the Stack Emails SDK, with React Email templates and safe retries.",
    category: "Tutorials",
    tags: ["nextjs", "react", "react-email", "tutorial", "nodejs"],
    publishedAt: "2026-09-30T09:00:00.000Z",
    seoTitle: "Send email from Next.js App Router (Server Actions guide)",
    seoDescription: "Step-by-step: send transactional email from Next.js Server Actions and Route Handlers using the Stack Emails SDK and React Email templates.",
    content: `This tutorial sends a welcome email from a Next.js App Router project using a Server Action. It takes about five minutes.

## 1. Get an API key and verify a domain

Create a free account, add your domain under **Domains** and add the DNS records it shows you. Then create an API key under **API Keys**: a *sending access* key scoped to that domain is ideal for production.

Add it to \`.env.local\`:

\`\`\`bash
STACKEMAILS_API_KEY=se_live_xxxxxxxxxxxx
\`\`\`

## 2. Install the SDK

\`\`\`bash
npm install stackemails
\`\`\`

## 3. Send from a Server Action

Server Actions run only on the server, so your API key never reaches the browser.

\`\`\`ts
// app/actions.ts
"use server";

import { StackEmails } from "stackemails";

const stack = new StackEmails(process.env.STACKEMAILS_API_KEY);

export async function sendWelcome(formData: FormData) {
  const email = String(formData.get("email"));

  const { id } = await stack.emails.send({
    from: "Acme <hello@mail.acme.com>",
    to: email,
    subject: "Welcome to Acme",
    html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
  });

  return id;
}
\`\`\`

The SDK throws a \`StackEmailsError\` (with \`status\`, \`code\` and \`message\`) when a request fails, so wrap the call in \`try/catch\` if you want to show a friendly error.

## 4. Use React Email for templates

[React Email](https://react.email) lets you write emails as components. Install \`@react-email/render\` and pass the element as \`react\`: the SDK renders it to HTML for you:

\`\`\`tsx
import { WelcomeEmail } from "@/emails/welcome";

await stack.emails.send({ from, to, subject: "Welcome", react: <WelcomeEmail name="Ada" /> });
\`\`\`

## 5. Make retries safe

Networks fail. If your action retries after a timeout, you could send the same email twice. Pass an **idempotency key** derived from the event, and Stack Emails returns the original email instead of sending another:

\`\`\`ts
await stack.emails.send({ ...payload, idempotencyKey: \`welcome/\${userId}\` });
\`\`\`

## 6. Don't block the response

Sending is fast, but you can still keep it off the critical path with \`after()\` from \`next/server\`, which runs work after the response has streamed:

\`\`\`ts
import { after } from "next/server";

after(() => stack.emails.send(payload));
\`\`\`

## 7. React to delivery events

Add a webhook endpoint under **Webhooks** to receive \`email.delivered\`, \`email.bounced\` and other events in a Route Handler. See [how to verify webhook signatures](/blog/email-webhooks-guide).

That's it. You're sending production email from Next.js. The full API is in the [docs](/docs).`,
  },
  {
    slug: "email-webhooks-guide",
    title: "Email webhooks: track delivery, bounces and opens in real time",
    excerpt: "How email webhooks work, which events to handle, and how to verify signatures so nobody can forge them.",
    category: "Tutorials",
    tags: ["webhooks", "security", "tutorial", "nodejs"],
    publishedAt: "2026-10-07T09:00:00.000Z",
    content: `An email API tells you a message was *accepted*. Webhooks tell you what happened next: delivered, bounced, opened, clicked, or marked as spam.

## Events Stack Emails sends

| Event | When it fires |
| --- | --- |
| \`email.sent\` | Accepted by the mail provider |
| \`email.delivered\` | Accepted by the recipient's mail server |
| \`email.delivery_delayed\` | Temporary failure, still retrying |
| \`email.bounced\` | Permanently rejected |
| \`email.complained\` | Recipient reported spam |
| \`email.opened\` / \`email.clicked\` | Engagement (if tracking is enabled) |
| \`email.received\` | Inbound message arrived |
| \`contact.*\`, \`domain.*\` | Audience and domain changes |

## Payload shape

\`\`\`json
{
  "id": "evt_3kq...",
  "type": "email.delivered",
  "created_at": "2026-10-07T09:12:44.000Z",
  "data": {
    "email_id": "msg_8f2b...",
    "to": ["ada@example.com"],
    "subject": "Your receipt"
  }
}
\`\`\`

## Verify the signature

Anyone who discovers your endpoint URL could post fake events to it. Every Stack Emails webhook is signed with your workspace's webhook secret:

\`\`\`
X-StackEmails-Signature-V2: t=1760000000,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
\`\`\`

The signature is an HMAC-SHA256 of \`\${t}.\${rawBody}\`. Including the timestamp stops attackers replaying an old, genuine event. Use the SDK helper:

\`\`\`ts
// app/api/webhooks/email/route.ts
import { verifyWebhook } from "stackemails";

export async function POST(req: Request) {
  const raw = await req.text(); // the raw body, not parsed JSON
  const ok = await verifyWebhook(raw, req.headers.get("x-stackemails-signature-v2"), process.env.STACKEMAILS_WEBHOOK_SECRET!);
  if (!ok) return new Response("invalid signature", { status: 401 });

  const event = JSON.parse(raw);
  // ...handle event.type
  return new Response("ok");
}
\`\`\`

Always verify against the **raw** body, re-serialising parsed JSON changes whitespace and breaks the signature.

## Handle retries and duplicates

If your endpoint returns anything other than a \`2xx\` within 10 seconds, Stack Emails retries with backoff: after 30 seconds, 2 minutes, 10 minutes, 1 hour and 6 hours. That means you may occasionally receive the same event twice, so:

- Respond quickly and do heavy work in a background job.
- Deduplicate on the event \`id\` (also sent as the \`X-StackEmails-Event-Id\` header).
- Use the delivery log under **Webhooks** to inspect payloads and redeliver manually.

With signed, retried webhooks, your app always knows the true state of every email.`,
  },
  {
    slug: "reduce-email-bounce-rate",
    title: "How to reduce your email bounce rate",
    excerpt: "Hard bounces, soft bounces and suppression lists explained, plus seven practical ways to keep your bounce rate low.",
    category: "Deliverability",
    tags: ["bounces", "deliverability", "list-hygiene"],
    publishedAt: "2026-10-14T09:00:00.000Z",
    content: `Your bounce rate is the share of messages that could not be delivered. It is one of the first numbers inbox providers and sending platforms look at when deciding whether to trust you.

## Hard vs soft bounces

- A **hard bounce** is permanent: the mailbox does not exist, or the domain has no mail server. You should never send to that address again.
- A **soft bounce** is temporary: the mailbox is full, the server is down, or the message was too large. These usually resolve themselves.

Stack Emails only suppresses an address after a **permanent** bounce, and only the specific recipient that bounced, not every recipient on the message.

## What is a good bounce rate?

Aim for **under 2%**. Amazon SES places accounts under review at 5% and may pause sending at 10%, so a sudden spike deserves immediate attention.

## Seven ways to bring it down

1. **Validate at the point of capture.** Check syntax and catch common typos (\`gmial.com\`) in your signup form.
2. **Use double opt-in for marketing lists.** A confirmation email proves the address is real and wanted.
3. **Never buy or rent lists.** They are full of dead addresses and spam traps.
4. **Respect your suppression list.** Stack Emails blocks sends to suppressed addresses automatically and shows them under *Emails > Suppressions*.
5. **Sunset unengaged contacts.** Addresses that haven't opened anything in a year are likely abandoned.
6. **Re-confirm old lists before mailing them.** If a list hasn't been used in six months, send a small batch first.
7. **Watch bounces per domain.** A spike at one provider often points to a block, not bad addresses.

## Use webhooks to keep your own database clean

Listen for \`email.bounced\` [webhooks](/blog/email-webhooks-guide) and mark the user's email as invalid in your app, so they are prompted to update it next time they log in.

A clean list is the cheapest deliverability win there is.`,
  },
  {
    slug: "send-email-from-ai-agents-mcp",
    title: "Let AI agents send email with the Stack Emails MCP server",
    excerpt: "Connect Claude, Cursor or any MCP client to Stack Emails so agents can send email, check delivery and manage contacts.",
    category: "Product",
    tags: ["mcp", "ai-agents", "claude", "product"],
    publishedAt: "2026-10-21T09:00:00.000Z",
    content: `The **Model Context Protocol** (MCP) is an open standard for connecting AI assistants to tools. Stack Emails runs a remote MCP server, so any MCP-capable client can send email on your behalf, with the same domain checks, quotas and logs as the REST API.

## What agents can do

| Tool | What it does |
| --- | --- |
| \`send_email\` | Send an email from a verified domain |
| \`list_emails\` / \`get_email\` | Check recent sends and delivery status |
| \`list_domains\` | See which domains can send |
| \`create_contact\` / \`list_contacts\` | Manage your audience |
| \`list_segments\` | List audience segments |
| \`list_received_emails\` | Read inbound mail |

## Connect a client

The server lives at \`https://stackemails.com/api/mcp\` and authenticates with a normal API key as a bearer token. Most clients accept a config like this:

\`\`\`json
{
  "mcpServers": {
    "stackemails": {
      "url": "https://stackemails.com/api/mcp",
      "headers": { "Authorization": "Bearer se_live_xxxxxxxxxxxx" }
    }
  }
}
\`\`\`

## Keep agents on a short leash

Agents make mistakes, so give them the least access they need:

- Create a **sending access** key, which cannot read or change anything except sending.
- **Scope the key to one domain**, so the agent can only send from, say, \`agents.acme.com\`.
- Review everything the agent sent in **Emails** and **Logs**: MCP calls are logged like any other API request.

## Example prompt

> "Email the five newest contacts in the *Beta* segment a short thank-you note from team@agents.acme.com, then tell me which ones were delivered."

The agent calls \`list_contacts\`, sends five emails with \`send_email\`, then checks each with \`get_email\`.

MCP turns email from something you integrate into something your agents can simply use. Read the [MCP docs](/docs/mcp) to get started.`,
  },
];
