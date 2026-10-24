/**
 * API reference rendered at /docs/[slug]. Markdown, rendered server-side
 * with heading anchors. Keep in sync with src/app/api/v1/*.
 */
export type DocPage = { slug: string; title: string; group: string; description: string; content: string };

const BASE = "https://stackemails.com/v1";

export const DOCS: DocPage[] = [
  {
    slug: "quickstart",
    group: "Getting started",
    title: "Quickstart",
    description: "Send your first email with Stack Emails in under five minutes.",
    content: `## 1. Create an API key

Sign up, open **API Keys** in the dashboard and create a key. Keys start with \`se_live_\` (or \`se_test_\` for test mode). Store it as an environment variable. You'll only see it once.

\`\`\`bash
export STACKEMAILS_API_KEY=se_live_xxxxxxxxxxxx
\`\`\`

## 2. Verify a domain

Open **Domains > Add domain**, enter a domain you own (we recommend a subdomain such as \`mail.acme.com\`) and add the DNS records shown at your DNS provider. Verification usually takes a few minutes. See [Domains](/docs/domains) for details.

Until your domain is verified you can only send from addresses on domains you have verified.

## 3. Send an email

\`\`\`bash
curl -X POST ${BASE}/emails \\
  -H "Authorization: Bearer $STACKEMAILS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "Acme <hello@mail.acme.com>",
    "to": "you@example.com",
    "subject": "Hello from Stack Emails",
    "html": "<p>It works!</p>"
  }'
\`\`\`

The response contains the email id:

\`\`\`json
{ "id": "msg_5b1f0c6c2a8e4e0f", "status": "queued", "scheduled_at": null }
\`\`\`

## 4. Or use the SDK

\`\`\`bash
npm install stackemails
\`\`\`

\`\`\`ts
import { StackEmails } from "stackemails";

const stack = new StackEmails(process.env.STACKEMAILS_API_KEY);

const { id } = await stack.emails.send({
  from: "Acme <hello@mail.acme.com>",
  to: "you@example.com",
  subject: "Hello from Stack Emails",
  html: "<p>It works!</p>",
});
\`\`\`

Snippets for Python, PHP, Go, Ruby, Java, .NET, Rust and Elixir are in the dashboard under **API Keys > Code**.

## Next steps

- Track what happens next with [webhooks](/docs/webhooks).
- Add [idempotency keys](/docs/idempotency) so retries never send twice.
- Read the [deliverability guide](/blog/email-deliverability-guide).`,
  },
  {
    slug: "authentication",
    group: "Getting started",
    title: "Authentication",
    description: "Authenticate API requests with bearer API keys, and choose the right key permissions.",
    content: `All API requests are authenticated with an API key sent as a bearer token:

\`\`\`
Authorization: Bearer se_live_xxxxxxxxxxxx
\`\`\`

The base URL is \`${BASE}\`. All requests must use HTTPS and JSON bodies (\`Content-Type: application/json\`).

## Key permissions

| Permission | Can do |
| --- | --- |
| \`full_access\` | Every endpoint: emails, domains, contacts, broadcasts and more |
| \`sending_access\` | Only send endpoints: \`POST /emails\`, \`POST /emails/batch\`, \`POST /events\` |

Sending-access keys can also be **restricted to one domain**. A key restricted to \`mail.acme.com\` is rejected if it tries to send from any other domain, ideal for production services, SMTP integrations and AI agents.

## Test mode

Keys created in test mode (\`se_test_\`) behave like live keys but are labelled separately in logs, so you can keep development traffic apart.

## Keeping keys safe

- Never expose a key in client-side code or a public repository.
- Use one key per service so you can revoke it independently.
- Revoke a key instantly under **API Keys**; requests using it fail with \`401\` immediately.`,
  },
  {
    slug: "errors",
    group: "Getting started",
    title: "Errors",
    description: "HTTP status codes and error codes returned by the Stack Emails API.",
    content: `Errors use conventional HTTP status codes and a consistent JSON body:

\`\`\`json
{ "error": { "code": "validation_error", "message": "\`to\` must contain at least one recipient" } }
\`\`\`

Every response also carries an \`x-request-id\` header. Include it when contacting support.

## Status codes

| Status | Meaning |
| --- | --- |
| \`200\` / \`201\` / \`202\` | Success (202 = accepted and queued) |
| \`400\` | Invalid JSON |
| \`401\` | Missing, invalid or revoked API key |
| \`403\` | Key lacks permission, plan limit reached, or sender domain not allowed |
| \`404\` | Resource not found |
| \`409\` | Conflict (e.g. rescheduling an email that already sent) |
| \`422\` | Validation failed |
| \`429\` | Rate limit or sending quota exceeded |
| \`500\` | Something went wrong on our side |

## Common error codes

| Code | What to do |
| --- | --- |
| \`missing_api_key\` / \`invalid_api_key\` | Check the \`Authorization\` header |
| \`restricted_api_key\` | Use a full-access key for this endpoint |
| \`validation_error\` | Fix the field named in \`message\` |
| \`invalid_from_address\` / \`domain_not_verified\` | Verify the sender's domain first |
| \`quota_exceeded\` | Wait for your quota to reset or upgrade your plan |
| \`rate_limited\` | Back off and retry after the \`retry-after\` header |
| \`account_suspended\` / \`account_restricted\` | Contact support |`,
  },
  {
    slug: "rate-limits",
    group: "Getting started",
    title: "Rate limits & quotas",
    description: "Per-key request rate limits and plan sending quotas.",
    content: `## Rate limits

Rate limits are applied per API key using a one-second sliding window.

| Endpoint | Limit |
| --- | --- |
| \`POST /emails\` | 100 requests / second |
| \`POST /emails/batch\` | 20 requests / second (up to 100 emails each) |
| \`POST /events\` | 50 requests / second |
| Everything else | 10 requests / second |

Every response includes \`x-ratelimit-limit\`, \`x-ratelimit-remaining\` and \`x-ratelimit-reset\` headers. When you exceed the limit you receive \`429 rate_limited\` with a \`retry-after\` header.

## Sending quotas

Each plan has a daily and a monthly sending quota. Usage is metered **per recipient**: an email sent to three addresses across \`to\`, \`cc\` and \`bcc\` uses three units. Sends beyond your quota return \`429 quota_exceeded\` and are not charged.

| Plan | Per day | Per month |
| --- | --- | --- |
| Free | 100 | 3,000 |
| Pro | 5,000 | 150,000 |
| Scale | 50,000 | 1,500,000 |

The daily counter resets at 00:00 UTC; the monthly counter resets on your billing date. See [pricing](/pricing).`,
  },
  {
    slug: "idempotency",
    group: "Getting started",
    title: "Idempotency",
    description: "Retry requests safely without sending duplicate emails.",
    content: `Network errors and timeouts happen. To retry a send without risking a duplicate email, include an \`Idempotency-Key\` header:

\`\`\`bash
curl -X POST ${BASE}/emails \\
  -H "Authorization: Bearer $STACKEMAILS_API_KEY" \\
  -H "Idempotency-Key: welcome-email/user_123" \\
  -H "Content-Type: application/json" \\
  -d '{ "from": "...", "to": "...", "subject": "...", "html": "..." }'
\`\`\`

If a request with the same key has already been accepted, the API returns the original email (status \`200\` instead of \`202\`) and does not send again.

- Keys are scoped to your team and can be up to 256 characters.
- Derive them from the event that triggers the email, e.g. \`order-receipt/ord_789\`.
- For [batch sends](/docs/emails#send-a-batch), the key applies to the whole batch; each item uses \`<key>:<index>\`.

With the SDK:

\`\`\`ts
await stack.emails.send({ from, to, subject, html, idempotencyKey: \`welcome/\${user.id}\` });
\`\`\``,
  },
  {
    slug: "emails",
    group: "Sending",
    title: "Emails",
    description: "Send, schedule, retrieve, list, reschedule and cancel emails.",
    content: `## Send an email

\`POST /v1/emails\`

| Field | Type | Description |
| --- | --- | --- |
| \`from\` | string | **Required.** Sender, e.g. \`Acme <hello@mail.acme.com>\`. Must be on a verified domain. |
| \`to\` | string \\| string[] | **Required.** Recipient(s). |
| \`subject\` | string | **Required.** |
| \`html\` | string | HTML body. \`html\` and/or \`text\` is required. |
| \`text\` | string | Plain-text body. |
| \`cc\`, \`bcc\`, \`reply_to\` | string \\| string[] | Optional. Up to 50 recipients in total. |
| \`headers\` | object | Custom headers, e.g. \`{ "X-Entity-Ref-ID": "123" }\`. |
| \`attachments\` | array | Up to 20 files, 10 MB total. \`{ filename, content (base64), content_type? }\`. |
| \`tags\` | array | Up to 10 \`{ name, value }\` pairs (letters, numbers, \`_\` and \`-\`). |
| \`scheduled_at\` | string | ISO 8601 timestamp up to 30 days in the future. |

\`\`\`bash
curl -X POST ${BASE}/emails \\
  -H "Authorization: Bearer $STACKEMAILS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "Acme <billing@mail.acme.com>",
    "to": ["ada@example.com"],
    "subject": "Your receipt",
    "html": "<p>Thanks for your order!</p>",
    "tags": [{ "name": "category", "value": "receipt" }],
    "attachments": [{ "filename": "receipt.pdf", "content": "JVBERi0xLjQK..." }]
  }'
\`\`\`

Response \`202\`:

\`\`\`json
{ "id": "msg_5b1f0c6c2a8e4e0f", "status": "queued", "scheduled_at": null }
\`\`\`

Emails to addresses on your [suppression list](/docs/emails#suppressions) are skipped automatically.

## Send a batch

\`POST /v1/emails/batch\`: an array of up to 100 email objects (attachments and \`scheduled_at\` aren't supported in batches). Validation is all-or-nothing; each email is then queued independently.

\`\`\`json
{
  "data": [{ "id": "msg_..." }, { "id": "msg_..." }],
  "errors": []
}
\`\`\`

## Schedule an email

Pass \`scheduled_at\` when sending:

\`\`\`json
{ "from": "...", "to": "...", "subject": "...", "html": "...", "scheduled_at": "2026-11-01T09:00:00Z" }
\`\`\`

The email's status is \`scheduled\` until it sends.

### Reschedule

\`PATCH /v1/emails/:id\` with \`{ "scheduled_at": "..." }\`. Only emails still in \`scheduled\` status can be changed.

### Cancel

\`POST /v1/emails/:id/cancel\` returns \`{ "id": "msg_...", "status": "canceled" }\`.

## Retrieve an email

\`GET /v1/emails/:id\` returns the email with its HTML, text, tags, attachments metadata, open and click counts and full event timeline.

\`\`\`json
{
  "object": "email",
  "id": "msg_5b1f0c6c2a8e4e0f",
  "from": "Acme <billing@mail.acme.com>",
  "to": ["ada@example.com"],
  "subject": "Your receipt",
  "status": "delivered",
  "last_event": "delivered",
  "created_at": "2026-10-20T10:15:02.000Z",
  "sent_at": "2026-10-20T10:15:03.000Z",
  "delivered_at": "2026-10-20T10:15:05.000Z",
  "opens": 1,
  "clicks": 0,
  "events": [
    { "type": "queued", "at": "2026-10-20T10:15:02.000Z", "detail": null },
    { "type": "sent", "at": "2026-10-20T10:15:03.000Z", "detail": null },
    { "type": "delivered", "at": "2026-10-20T10:15:05.000Z", "detail": null }
  ]
}
\`\`\`

## List emails

\`GET /v1/emails?limit=20&after=<id>&status=delivered\`

Returns \`{ "object": "list", "has_more": true, "data": [...] }\`, newest first. Paginate by passing the last id as \`after\`. \`limit\` is 1–100.

## Statuses

\`queued\`, then \`sent\`, then \`delivered\`, with \`scheduled\`, \`canceled\`, \`delivery_delayed\`, \`bounced\`, \`complained\`, \`opened\`, \`clicked\` and \`failed\` along the way.

## Suppressions

Addresses that hard-bounce or file a spam complaint are added to your team's suppression list, and later sends to them are skipped. Manage the list in **Emails > Suppressions**.`,
  },
  {
    slug: "domains",
    group: "Sending",
    title: "Domains",
    description: "Add, verify and configure sending domains via the API.",
    content: `## Add a domain

\`POST /v1/domains\`

\`\`\`json
{ "name": "mail.acme.com" }
\`\`\`

Response \`201\` includes the DNS records to publish:

\`\`\`json
{
  "object": "domain",
  "id": "66f1...",
  "name": "mail.acme.com",
  "status": "pending",
  "records": [
    { "record": "DKIM", "type": "CNAME", "name": "abc._domainkey.mail.acme.com", "value": "abc.dkim.amazonses.com", "status": "pending" },
    { "record": "SPF", "type": "MX", "name": "send.mail.acme.com", "value": "feedback-smtp.eu-north-1.amazonses.com", "status": "pending" },
    { "record": "SPF", "type": "TXT", "name": "send.mail.acme.com", "value": "v=spf1 include:amazonses.com ~all", "status": "pending" },
    { "record": "DMARC", "type": "TXT", "name": "_dmarc.mail.acme.com", "value": "v=DMARC1; p=none;", "status": "pending" }
  ],
  "capabilities": { "sending": "disabled", "receiving": "disabled" }
}
\`\`\`

## Verify

\`POST /v1/domains/:id/verify\` checks DNS immediately. Pending domains are also re-checked automatically every 10 minutes, and a \`domain.verified\` webhook fires when verification succeeds.

## Retrieve, list, update, delete

- \`GET /v1/domains\` and \`GET /v1/domains/:id\`
- \`PATCH /v1/domains/:id\` with any of \`open_tracking\`, \`click_tracking\` (booleans), \`tls\` (\`opportunistic\` | \`enforced\`), \`receiving\` (boolean)
- \`DELETE /v1/domains/:id\`

See the [SPF, DKIM and DMARC guide](/blog/spf-dkim-dmarc-setup-guide) for provider-specific tips.`,
  },
  {
    slug: "contacts",
    group: "Audience",
    title: "Contacts & properties",
    description: "Create, update, list and delete contacts and custom contact properties.",
    content: `Contacts belong to your team and can be in any number of [segments](/docs/segments-topics).

## Create or update a contact

\`POST /v1/contacts\`: creates the contact, or updates it if the email already exists (\`201\` created, \`200\` updated).

\`\`\`json
{
  "email": "ada@example.com",
  "first_name": "Ada",
  "last_name": "Lovelace",
  "properties": { "plan": "pro", "company": "Analytical Engines" },
  "segment_ids": ["66f2..."]
}
\`\`\`

## Retrieve, update, delete

\`/v1/contacts/:id\` accepts a contact id **or** an email address.

- \`GET\`: returns the contact.
- \`PATCH\`: any of \`first_name\`, \`last_name\`, \`unsubscribed\`, \`properties\`, \`segment_ids\`, and \`topics: [{ topic_id, subscription: "opt_in" | "opt_out" }]\`.
- \`DELETE\`: permanently removes the contact.

\`\`\`json
{
  "object": "contact",
  "id": "66f3...",
  "email": "ada@example.com",
  "first_name": "Ada",
  "last_name": "Lovelace",
  "unsubscribed": false,
  "properties": { "plan": "pro" },
  "segment_ids": ["66f2..."],
  "topics": [{ "topic_id": "66f4...", "subscribed": true }],
  "created_at": "2026-10-20T10:00:00.000Z"
}
\`\`\`

## List contacts

\`GET /v1/contacts?segment_id=&q=&unsubscribed=true|false&limit=&after=\`

## Contact properties

Define custom fields once and use them in merge tags like \`{{contact.plan}}\`.

- \`POST /v1/contact-properties\`: \`{ "key": "plan", "label": "Plan", "type": "string", "fallback_value": "free" }\`. Keys are snake_case; \`type\` is \`string\`, \`number\`, \`boolean\` or \`date\`.
- \`GET /v1/contact-properties\``,
  },
  {
    slug: "segments-topics",
    group: "Audience",
    title: "Segments & topics",
    description: "Group contacts into segments and manage subscription topics.",
    content: `## Segments

Segments are named groups of contacts used as broadcast targets.

- \`POST /v1/segments\`: \`{ "name": "Beta users", "description": "..." }\`
- \`GET /v1/segments\`: includes \`contacts\` and \`unsubscribed\` counts
- \`GET /v1/segments/:id\`
- \`DELETE /v1/segments/:id\`: contacts are kept; they're just removed from the segment

## Topics

Topics let contacts choose *what* they receive, for example "Product updates" vs "Security notices", instead of unsubscribing from everything.

- \`POST /v1/topics\`: \`{ "name": "Product updates", "default_subscription": "opt_in" | "opt_out", "visibility": "public" | "private" }\`
- \`GET /v1/topics\`
- \`PATCH /v1/topics/:id\`, \`DELETE /v1/topics/:id\`

With \`opt_in\` as the default, contacts receive the topic unless they opt out. With \`opt_out\`, they must explicitly subscribe. Public topics appear on the hosted unsubscribe page so recipients can manage them.

Set a contact's subscriptions with \`PATCH /v1/contacts/:id\` and \`topics\`.`,
  },
  {
    slug: "broadcasts",
    group: "Audience",
    title: "Broadcasts",
    description: "Create, schedule and send marketing broadcasts to segments.",
    content: `## Create a broadcast

\`POST /v1/broadcasts\`

| Field | Description |
| --- | --- |
| \`segment_id\` | **Required.** Who receives it. |
| \`from\`, \`subject\`, \`html\` | **Required.** |
| \`name\` | Internal name. |
| \`topic_id\` | Only send to contacts subscribed to this topic. |
| \`reply_to\`, \`preview_text\` | Optional. |
| \`send\` | \`true\` to send (or schedule) immediately. |
| \`scheduled_at\` | ISO timestamp up to 30 days ahead (with \`send: true\`). |

The HTML can use merge tags: \`{{first_name}}\`, \`{{last_name}}\`, \`{{email}}\`, \`{{contact.<key>}}\` and \`{{unsubscribe_url}}\`. Every broadcast gets one-click unsubscribe headers and a footer link automatically. Unsubscribed and suppressed contacts are skipped.

## Send a draft

\`POST /v1/broadcasts/:id/send\`: optionally with \`{ "scheduled_at": "..." }\`. Returns the broadcast with \`queued\` and \`skipped\` counts.

## List broadcasts

\`GET /v1/broadcasts\``,
  },
  {
    slug: "events",
    group: "Audience",
    title: "Events & automations",
    description: "Trigger automations from your app with custom events.",
    content: `Automations are multi-step email sequences built in the dashboard. They can start when a contact is created, joins a segment, or when your app sends a **custom event**.

## Send an event

First create the event under **Automations > Events**, then:

\`POST /v1/events\` (works with sending-access keys)

\`\`\`json
{ "name": "trial.started", "email": "ada@example.com", "data": { "plan": "pro" } }
\`\`\`

The contact is created if it doesn't exist. Response \`202\`:

\`\`\`json
{ "object": "event", "name": "trial.started", "contact_id": "66f3...", "emails_scheduled": 3 }
\`\`\`

Event names may contain letters, numbers, \`.\`, \`_\`, \`:\` and \`-\` (max 80 characters).`,
  },
  {
    slug: "webhooks",
    group: "Events",
    title: "Webhooks",
    description: "Receive signed, retried webhook events for email, contact and domain activity.",
    content: `Add endpoints under **Webhooks** in the dashboard and choose which events each receives.

## Events

\`email.sent\`, \`email.delivered\`, \`email.delivery_delayed\`, \`email.bounced\`, \`email.complained\`, \`email.opened\`, \`email.clicked\`, \`email.failed\`, \`email.received\`, \`contact.created\`, \`contact.updated\`, \`contact.deleted\`, \`domain.created\`, \`domain.verified\`, \`domain.deleted\`.

## Payload

\`\`\`json
{
  "id": "evt_3kq9...",
  "type": "email.delivered",
  "created_at": "2026-10-20T10:15:05.000Z",
  "data": { "email_id": "msg_5b1f...", "from": "Acme <billing@mail.acme.com>", "to": ["ada@example.com"], "subject": "Your receipt", "status": "delivered" }
}
\`\`\`

## Headers

| Header | Value |
| --- | --- |
| \`x-stackemails-event\` | Event type |
| \`x-stackemails-event-id\` | Unique event id. Use it to deduplicate |
| \`x-stackemails-delivery-attempt\` | 1–6 |
| \`x-stackemails-timestamp\` | Unix seconds |
| \`x-stackemails-signature-v2\` | \`t=<unix>,v1=<hex hmac>\` |

## Verifying signatures

\`v1\` is the hex HMAC-SHA256 of \`\${t}.\${rawBody}\` using your webhook secret (shown on the Webhooks page). Reject events whose timestamp is more than five minutes old.

\`\`\`ts
import { verifyWebhook } from "stackemails";

const raw = await req.text();
const ok = await verifyWebhook(raw, req.headers.get("x-stackemails-signature-v2"), process.env.STACKEMAILS_WEBHOOK_SECRET!);
\`\`\`

Without the SDK (Node.js):

\`\`\`js
import crypto from "node:crypto";

function verify(raw, header, secret) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(\`\${parts.t}.\${raw}\`).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
\`\`\`

## Retries

Respond with any \`2xx\` within 10 seconds. Otherwise the delivery is retried after 30 s, 2 min, 10 min, 1 h and 6 h (six attempts in total). Redirects are not followed. Every attempt is visible on the endpoint's page, where you can also redeliver an event.

Endpoints must be public HTTPS URLs; private network addresses are rejected.`,
  },
  {
    slug: "receiving",
    group: "Events",
    title: "Receiving email",
    description: "Receive inbound email on a free address or your own domain.",
    content: `## Receiving addresses

Every team has a free receiving domain shown under **Emails > Receiving**: any address at it (for example \`support@<your-key>.in.stackemails.com\`) is delivered to your team.

To receive on your own domain, enable receiving on a verified domain (\`PATCH /v1/domains/:id\` with \`{ "receiving": true }\`) and add the MX record it shows.

## The email.received event

Each inbound message triggers an \`email.received\` [webhook](/docs/webhooks) with the parsed message:

\`\`\`json
{
  "type": "email.received",
  "data": {
    "email_id": "inb_...",
    "from": "Ada <ada@example.com>",
    "to": ["support@mail.acme.com"],
    "subject": "Question about my invoice",
    "inbox_id": null,
    "created_at": "2026-10-20T10:20:00.000Z"
  }
}
\`\`\`

Messages are also visible in the dashboard, and in shared **Inboxes** where your team can read threads and reply.`,
  },
  {
    slug: "smtp",
    group: "Integrations",
    title: "SMTP relay",
    description: "Send through Stack Emails from any tool that supports SMTP.",
    content: `| Setting | Value |
| --- | --- |
| Host | \`smtp.stackemails.com\` |
| Port | \`465\` (implicit TLS) or \`587\` (STARTTLS) |
| Username | \`stackemails\` |
| Password | An API key (\`se_live_...\`) |

SMTP sends go through the same pipeline as the API: domain checks, suppression, quotas, logs and webhooks all apply. Use a sending-access key restricted to one domain for each tool.

### Nodemailer

\`\`\`js
import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: "smtp.stackemails.com",
  port: 465,
  secure: true,
  auth: { user: "stackemails", pass: process.env.STACKEMAILS_API_KEY },
});

await transport.sendMail({ from: "hello@mail.acme.com", to: "ada@example.com", subject: "Hi", html: "<p>Hello</p>" });
\`\`\``,
  },
  {
    slug: "mcp",
    group: "Integrations",
    title: "MCP server",
    description: "Connect AI agents to Stack Emails with the Model Context Protocol.",
    content: `Stack Emails runs a remote MCP server (streamable HTTP, JSON-RPC 2.0) at:

\`\`\`
https://stackemails.com/api/mcp
\`\`\`

Authenticate with an API key as a bearer token:

\`\`\`json
{
  "mcpServers": {
    "stackemails": {
      "url": "https://stackemails.com/api/mcp",
      "headers": { "Authorization": "Bearer se_live_..." }
    }
  }
}
\`\`\`

## Tools

| Tool | Description |
| --- | --- |
| \`send_email\` | Send an email (\`from\`, \`to\`, \`subject\`, \`html\` / \`text\`) |
| \`list_emails\` | Recent emails with status |
| \`get_email\` | One email with its event timeline |
| \`list_domains\` | Domains and verification status |
| \`create_contact\` | Add or update a contact |
| \`list_contacts\` | Contacts, optionally by segment |
| \`list_segments\` | Segments |
| \`list_received_emails\` | Recent inbound emails |

Agents are subject to the same domain restrictions, quotas and logs as any API key. Use a sending-access key restricted to a dedicated domain for agents.`,
  },
  {
    slug: "sdk",
    group: "Integrations",
    title: "Node.js SDK",
    description: "The official TypeScript SDK for Node.js, Next.js, Bun and edge runtimes.",
    content: `\`\`\`bash
npm install stackemails
\`\`\`

\`\`\`ts
import { StackEmails } from "stackemails";

const stack = new StackEmails(process.env.STACKEMAILS_API_KEY, {
  // optional
  baseUrl: "https://stackemails.com",
  maxRetries: 2,
});
\`\`\`

The client retries network errors and \`429\` / \`5xx\` responses with backoff, and throws a \`StackEmailsError\` (\`status\`, \`code\`, \`message\`, \`requestId\`) on failure.

## Resources

| Resource | Methods |
| --- | --- |
| \`stack.emails\` | \`send\`, \`batch\`, \`get\`, \`list\`, \`update\`, \`cancel\` |
| \`stack.domains\` | \`create\`, \`get\`, \`list\`, \`update\`, \`verify\`, \`remove\` |
| \`stack.contacts\` | \`create\`, \`get\`, \`list\`, \`update\`, \`remove\` |
| \`stack.segments\` | \`create\`, \`get\`, \`list\`, \`remove\` |
| \`stack.topics\` | \`create\`, \`list\`, \`update\`, \`remove\` |
| \`stack.broadcasts\` | \`create\`, \`list\`, \`send\` |
| \`stack.events\` | \`send\` |

## React Email

Install \`@react-email/render\` and pass a component as \`react\`:

\`\`\`tsx
await stack.emails.send({ from, to, subject: "Welcome", react: <WelcomeEmail name="Ada" /> });
\`\`\`

## Webhooks

\`\`\`ts
import { verifyWebhook } from "stackemails";
\`\`\`

See [Webhooks](/docs/webhooks).`,
  },
];

export const DOC_GROUPS = ["Getting started", "Sending", "Audience", "Events", "Integrations"];
export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug);
