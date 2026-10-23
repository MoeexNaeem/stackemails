/** Content for /features/[slug] landing pages (each targets one search intent). */
export type Feature = {
  slug: string;
  name: string;
  h1: string;
  highlight: string;
  metaTitle: string;
  metaDescription: string;
  lead: string;
  points: { title: string; body: string }[];
  code?: { label: string; lang: string; code: string };
  faqs: { q: string; a: string }[];
  related: string[];
};

export const FEATURES: Feature[] = [
  {
    slug: "transactional-email",
    name: "Transactional email API",
    h1: "The transactional email API that",
    highlight: "just works.",
    metaTitle: "Transactional email API for developers",
    metaDescription: "Send password resets, receipts and notifications with a simple REST API. Idempotent sends, batch and scheduled delivery, attachments, webhooks and SDKs.",
    lead: "Password resets, magic links, receipts and alerts — sent through one clean endpoint, authenticated on your domain and tracked from request to inbox.",
    points: [
      { title: "One endpoint, every language", body: "POST /v1/emails with a JSON body. A typed Node.js SDK, React Email support and copy-paste quickstarts for Python, PHP, Go, Ruby, Java, .NET, Rust, Elixir and cURL." },
      { title: "Safe retries with idempotency", body: "Send an Idempotency-Key header and repeated requests return the original email instead of sending twice — essential for queues and serverless retries." },
      { title: "Batch and schedule", body: "Send up to 100 emails per request, or schedule delivery up to 30 days ahead with an ISO timestamp. Reschedule or cancel any time before it goes out." },
      { title: "Attachments, headers and tags", body: "Attach files up to 10 MB in total, set custom headers, and tag emails so you can filter logs and webhook events by feature or customer." },
      { title: "Per-domain API keys", body: "Create sending-only keys restricted to a single domain, so a leaked key can't send from anywhere else." },
      { title: "Logs you can actually debug with", body: "Every API request is stored with its request and response body, status and latency. Every email shows its full event timeline." },
    ],
    code: {
      label: "Send an email",
      lang: "bash",
      code: `curl -X POST https://stackemails.com/v1/emails \\
  -H "Authorization: Bearer se_live_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: reset/8271" \\
  -d '{
    "from": "Acme <security@mail.acme.com>",
    "to": "ada@example.com",
    "subject": "Reset your password",
    "html": "<p>Click <a href=\\"https://acme.com/reset\\">here</a> to reset.</p>"
  }'`,
    },
    faqs: [
      { q: "How fast are transactional emails delivered?", a: "Emails are queued immediately and handed to Amazon SES within seconds. Delivery to the recipient's inbox typically completes in a few seconds, depending on the receiving server." },
      { q: "Do transactional emails need an unsubscribe link?", a: "Purely transactional messages such as receipts and password resets generally don't. Promotional content does — use Broadcasts for that, which adds one-click unsubscribe automatically." },
      { q: "What happens if I send to a bounced address?", a: "Addresses that hard-bounced or complained are on your suppression list, and the send is skipped so your reputation isn't harmed. You can remove an address from the list in the dashboard." },
    ],
    related: ["email-webhooks", "smtp-relay", "mcp-server"],
  },
  {
    slug: "marketing-email",
    name: "Broadcasts & marketing email",
    h1: "Newsletters and campaigns,",
    highlight: "without the bloat.",
    metaTitle: "Marketing email & newsletters for product teams",
    metaDescription: "Send broadcasts to segments of your contacts with merge tags, subscription topics, one-click unsubscribe and scheduling — on the same platform as your product email.",
    lead: "Contacts, segments, topics and broadcasts — everything you need to send product updates and newsletters, sharing one audience with your app.",
    points: [
      { title: "Contacts with custom properties", body: "Store any data on a contact — plan, company, signup date — via the API or CSV import, and use it to personalise content." },
      { title: "Segments", body: "Group contacts into segments for targeted sends. A contact can belong to any number of segments." },
      { title: "Subscription topics", body: "Let people opt out of 'Product updates' without leaving 'Security notices'. Topics can be opt-in or opt-out by default." },
      { title: "Merge tags", body: "Personalise subject and body with {{first_name}}, {{contact.company}} or any custom property, with per-property fallbacks for missing values." },
      { title: "Compliant by default", body: "Every broadcast includes RFC 8058 one-click unsubscribe headers, a footer link and a hosted preference page you can brand." },
      { title: "Schedule and test", body: "Send a test to yourself, schedule to the minute in your timezone, and watch delivered, opened and clicked counts update live." },
    ],
    faqs: [
      { q: "Can I import my existing list?", a: "Yes. Upload a CSV in Audience → Contacts. Columns are matched to email, first name, last name and any custom properties you've defined." },
      { q: "Do unsubscribes sync back to my app?", a: "Yes — subscribe to the contact.updated webhook, or read the unsubscribed flag and topic subscriptions from the Contacts API." },
      { q: "How do contacts count towards my plan?", a: "Each plan includes a number of contacts. Emails sent in broadcasts count towards your monthly email quota like any other send." },
    ],
    related: ["transactional-email", "email-webhooks", "inbound-email"],
  },
  {
    slug: "inbound-email",
    name: "Inbound email & inboxes",
    h1: "Receive, parse and reply to email",
    highlight: "in your app.",
    metaTitle: "Inbound email API & shared inboxes",
    metaDescription: "Receive email on your own domain or a free address, get parsed messages via webhook and API, and reply from shared team inboxes with threading.",
    lead: "Turn incoming email into structured data. Receive replies, support requests and forwarded documents on your domain, and act on them by webhook or from a shared inbox.",
    points: [
      { title: "Free receiving address", body: "Every team gets a unique receiving address instantly — no DNS needed to start testing." },
      { title: "Your own domain", body: "Point an MX record at Stack Emails to receive mail on support.acme.com or any subdomain." },
      { title: "Parsed for you", body: "Sender, recipients, subject, text and HTML bodies, headers and attachments — delivered as JSON in the email.received webhook." },
      { title: "Shared inboxes", body: "Create inboxes for support@ or sales@, see conversations threaded, and reply directly from the dashboard." },
      { title: "Spam and virus verdicts", body: "Messages carry the spam and virus verdicts from the receiving server so you can filter safely." },
      { title: "MCP access", body: "AI agents can read received mail through the MCP server's list_received_emails tool." },
    ],
    faqs: [
      { q: "What can I build with inbound email?", a: "Reply-by-email for comments and tickets, document ingestion (invoices, receipts), email-to-task workflows and support inboxes." },
      { q: "Is there a size limit?", a: "Inbound messages are limited by the receiving provider (Amazon SES accepts messages up to 40 MB)." },
    ],
    related: ["email-webhooks", "transactional-email", "mcp-server"],
  },
  {
    slug: "smtp-relay",
    name: "SMTP relay",
    h1: "An SMTP relay for tools that",
    highlight: "only speak SMTP.",
    metaTitle: "SMTP relay service with API-key auth",
    metaDescription: "Send through Stack Emails from WordPress, Supabase Auth, legacy apps and any tool with SMTP settings. Same logs, suppression and analytics as the API.",
    lead: "Not everything can call a REST API. Point any SMTP client at Stack Emails and get the same domain checks, suppression lists, logs and webhooks.",
    points: [
      { title: "Works with everything", body: "WordPress, Supabase Auth, Ghost, Django, Rails, Laravel, Nodemailer — anything with host, port, username and password fields." },
      { title: "API-key authentication", body: "Username is 'stackemails' and the password is an API key, so you can scope and revoke SMTP access per tool." },
      { title: "TLS required", body: "Connections use STARTTLS on port 587 or implicit TLS on 465." },
      { title: "One platform", body: "SMTP sends appear in Emails and Metrics alongside API sends, honour suppressions and fire the same webhooks." },
    ],
    code: {
      label: "SMTP settings",
      lang: "text",
      code: `Host:      smtp.stackemails.com
Port:      587 (STARTTLS) or 465 (TLS)
Username:  stackemails
Password:  se_live_...   (an API key)`,
    },
    faqs: [
      { q: "Should I use SMTP or the API?", a: "Use the API when you control the code — it's faster, supports idempotency and returns structured errors. Use SMTP for third-party tools that only offer SMTP settings." },
      { q: "Can I restrict an SMTP key to one domain?", a: "Yes. Create a sending-access API key scoped to the domain and use it as the SMTP password." },
    ],
    related: ["transactional-email", "email-webhooks", "marketing-email"],
  },
  {
    slug: "email-webhooks",
    name: "Email webhooks",
    h1: "Real-time email events,",
    highlight: "signed and retried.",
    metaTitle: "Email webhooks: delivery, bounce, open & click events",
    metaDescription: "Get signed webhook events for every email delivered, bounced, opened, clicked or received — with replay protection, automatic retries and a delivery log.",
    lead: "Know exactly what happened to every email. Webhooks push delivery, engagement, inbound and audience events to your endpoint the moment they happen.",
    points: [
      { title: "15 event types", body: "email.sent, delivered, delivery_delayed, bounced, complained, opened, clicked, failed and received, plus contact.* and domain.* events." },
      { title: "Signed with HMAC-SHA256", body: "Each request carries a timestamped signature over the raw body, so you can reject forged or replayed events. The SDK verifies it in one line." },
      { title: "Automatic retries", body: "Failed deliveries are retried after 30 s, 2 min, 10 min, 1 h and 6 h — six attempts in total." },
      { title: "Delivery log & redelivery", body: "Inspect every attempt's status code, response body and latency, and redeliver any event with a click." },
      { title: "Filter by event", body: "Subscribe each endpoint to only the events it needs, and add as many endpoints as your plan allows." },
      { title: "SSRF-safe", body: "Endpoints must be public HTTPS URLs; private and internal addresses are blocked on every attempt." },
    ],
    code: {
      label: "Verify a webhook (Node.js)",
      lang: "ts",
      code: `import { verifyWebhook } from "stackemails";

export async function POST(req: Request) {
  const raw = await req.text();
  const ok = await verifyWebhook(
    raw,
    req.headers.get("x-stackemails-signature-v2"),
    process.env.STACKEMAILS_WEBHOOK_SECRET!,
  );
  if (!ok) return new Response("invalid signature", { status: 401 });

  const event = JSON.parse(raw);
  if (event.type === "email.bounced") {
    // mark the address as invalid in your database
  }
  return new Response("ok");
}`,
    },
    faqs: [
      { q: "What counts as a successful delivery?", a: "Any 2xx response within 10 seconds. Anything else — including redirects — is treated as a failure and retried." },
      { q: "Can events arrive more than once?", a: "Yes, retries mean an event can occasionally be delivered twice. Deduplicate using the event id." },
    ],
    related: ["transactional-email", "inbound-email", "mcp-server"],
  },
  {
    slug: "mcp-server",
    name: "MCP server for AI agents",
    h1: "Give your AI agents",
    highlight: "an email address.",
    metaTitle: "Email MCP server for Claude, Cursor & AI agents",
    metaDescription: "Connect Claude, Cursor or any MCP client to Stack Emails. Agents can send email, check delivery, manage contacts and read inbound mail — safely scoped by API key.",
    lead: "A native Model Context Protocol server lets AI assistants send and read email through Stack Emails, with the same guardrails as your API.",
    points: [
      { title: "Remote, standards-based", body: "Streamable HTTP MCP endpoint at /api/mcp — no local process to install." },
      { title: "Useful tools", body: "send_email, list_emails, get_email, list_domains, create_contact, list_contacts, list_segments and list_received_emails." },
      { title: "Least privilege", body: "Authenticate with a sending-only key scoped to one domain so agents can never send from your main domain." },
      { title: "Fully audited", body: "Every tool call is logged like an API request, and every email appears in your dashboard." },
    ],
    code: {
      label: "MCP client config",
      lang: "json",
      code: `{
  "mcpServers": {
    "stackemails": {
      "url": "https://stackemails.com/api/mcp",
      "headers": { "Authorization": "Bearer se_live_..." }
    }
  }
}`,
    },
    faqs: [
      { q: "Which clients are supported?", a: "Any client that supports remote MCP servers over HTTP, including Claude, Cursor, VS Code and custom agents built with the MCP SDKs." },
      { q: "Do agent sends count towards my quota?", a: "Yes, they're normal sends and count towards your daily and monthly limits." },
    ],
    related: ["transactional-email", "inbound-email", "email-webhooks"],
  },
];

export const featureBySlug = (slug: string) => FEATURES.find((f) => f.slug === slug);
