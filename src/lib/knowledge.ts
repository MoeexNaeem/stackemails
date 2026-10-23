/**
 * Single source of truth for product knowledge. Feeds the in-app assistant
 * (system prompt + offline answers), the Help page knowledge base, the public
 * FAQ (with FAQPage JSON-LD) and llms-full.txt — so every surface says the same thing.
 */
export type Faq = { q: string; a: string; tags: string[]; category: "Getting started" | "Sending" | "Domains" | "Deliverability" | "Audience" | "Billing" | "Developers" | "Account" };

export const FAQS: Faq[] = [
  {
    category: "Getting started",
    q: "How do I send my first email?",
    a: "Create an API key on the API keys page, then POST to https://stackemails.com/v1/emails with `Authorization: Bearer se_live_...` and a JSON body containing from, to, subject and html (or text). The Onboarding page generates a ready-to-run snippet in 10 languages with your key pre-filled.",
    tags: ["first email", "quickstart", "send", "api key", "onboarding"],
  },
  {
    category: "Domains",
    q: "How do I verify my sending domain?",
    a: "Go to Domains → Add domain and enter the domain (a subdomain like mail.yourco.com is recommended). Add the DKIM CNAME records, the SPF TXT record on the MAIL FROM subdomain, and a DMARC TXT record at your DNS provider. Verification usually completes in minutes; DNS can take up to 48 hours. Click Verify on the domain page to re-check.",
    tags: ["domain", "verify", "dkim", "spf", "dmarc", "dns", "cname"],
  },
  {
    category: "Domains",
    q: "Why can't I send from a domain?",
    a: "You can only send from a domain (or a subdomain of a domain) that your team has verified. Requests from unverified domains are rejected with 403 domain_not_verified. Add the domain on the Domains page and complete DNS verification first.",
    tags: ["403", "domain_not_verified", "from", "sender", "spoofing"],
  },
  {
    category: "Deliverability",
    q: "How do I keep my emails out of spam?",
    a: "Authenticate with SPF, DKIM and DMARC; send from a subdomain dedicated to email; keep bounce rate under 4% and complaint rate under 0.08%; only email people who opted in; include a working unsubscribe link and List-Unsubscribe header on marketing mail; warm up new domains gradually; and send transactional and marketing mail from separate subdomains.",
    tags: ["spam", "inbox", "deliverability", "reputation", "bounce rate", "complaint"],
  },
  {
    category: "Deliverability",
    q: "What are bounces and complaints, and what happens to those addresses?",
    a: "A hard (permanent) bounce means the address doesn't exist; a soft (transient) bounce is temporary, like a full mailbox. A complaint means the recipient marked your mail as spam. Hard-bounced and complaining addresses are added to your Suppressions list automatically and skipped on future sends to protect your reputation.",
    tags: ["bounce", "complaint", "suppression", "suppressed"],
  },
  {
    category: "Sending",
    q: "What are the API rate limits?",
    a: "Each API key can make up to 100 ingestion requests per second. Plan quotas apply per team: a monthly email allowance and a daily limit. Over-limit requests return 429 with code rate_limited or quota_exceeded.",
    tags: ["rate limit", "429", "quota", "limits", "throughput"],
  },
  {
    category: "Sending",
    q: "How do idempotency keys work?",
    a: "Send an `Idempotency-Key` header with POST /v1/emails. If the same key is seen again, the original email id is returned instead of sending twice — safe for retries after network errors.",
    tags: ["idempotency", "retry", "duplicate"],
  },
  {
    category: "Sending",
    q: "Can I receive emails?",
    a: "Yes. Every team gets a receiving address, and you can enable receiving on your verified domain by adding an MX record. Received emails appear under Emails → Receiving and in Inboxes, and trigger the email.received webhook.",
    tags: ["receive", "inbound", "mx", "inbox", "receiving"],
  },
  {
    category: "Developers",
    q: "How do webhooks work and how do I verify them?",
    a: "Add an endpoint on the Webhooks page and choose events (email.sent, email.delivered, email.bounced, email.complained, email.opened, email.clicked, email.received, contact.created and more). Every request is signed with HMAC-SHA256 in the X-StackEmails-Signature header using your team's webhook secret — recompute the HMAC over the raw body and compare in constant time.",
    tags: ["webhook", "signature", "hmac", "events"],
  },
  {
    category: "Developers",
    q: "Is there an SDK?",
    a: "Yes — `npm install stackemails`, then `new StackEmails('se_live_...')` and `await client.emails.send({...})`. You can also use any HTTP client against the REST API, or SMTP (smtp.stackemails.com, ports 465/587, user `stackemails`, password = your API key).",
    tags: ["sdk", "npm", "node", "typescript", "smtp"],
  },
  {
    category: "Developers",
    q: "Can I use Stack Emails with AI agents (MCP)?",
    a: "Yes. Stack Emails exposes an MCP server so AI tools like Claude can send emails, list emails and manage contacts on your behalf. See Settings → Integrations → MCP server for the endpoint and configuration.",
    tags: ["mcp", "agents", "ai", "claude"],
  },
  {
    category: "Audience",
    q: "What's the difference between contacts, segments, properties and topics?",
    a: "Contacts are the people you email. Properties are custom fields on contacts (like plan or city) used for personalization. Segments are groups of contacts you target with broadcasts. Topics are subscription categories (like Product updates) that recipients can opt in or out of on the preference page.",
    tags: ["contacts", "segments", "properties", "topics", "audience"],
  },
  {
    category: "Audience",
    q: "How do I import contacts?",
    a: "Go to Audience → Contacts → Import contacts and upload a CSV with an email column (first_name, last_name and any property columns are optional). Duplicates are merged, invalid addresses are skipped, and you'll see a summary when the import completes.",
    tags: ["import", "csv", "contacts", "upload"],
  },
  {
    category: "Billing",
    q: "What plans do you offer?",
    a: "Free includes 3,000 emails/month (100/day). Pro is $25/month for 150,000 emails/month (5,000/day). Scale is $100/month for 1,500,000 emails/month (50,000/day). All plans include the API, SMTP, webhooks, domains and analytics; higher plans add more domains, contacts and support.",
    tags: ["pricing", "plans", "free", "pro", "scale", "cost"],
  },
  {
    category: "Billing",
    q: "What happens if I hit my quota?",
    a: "Sends beyond your daily or monthly allowance return 429 quota_exceeded until the window resets. Upgrade on Settings → Billing for more volume — upgrades take effect immediately.",
    tags: ["quota", "limit", "upgrade", "exceeded"],
  },
  {
    category: "Account",
    q: "How do I invite teammates?",
    a: "Go to Settings → Team → Invite, enter their email and pick a role (Admin or Member). They'll receive an invitation email; once accepted they can access the team's emails, domains and settings according to their role.",
    tags: ["team", "invite", "members", "roles"],
  },
  {
    category: "Account",
    q: "How do I contact support?",
    a: "Open Help → New ticket in the dashboard and describe the issue. Our team replies by email, usually within one business day. You can also email support@stackemails.com.",
    tags: ["support", "help", "ticket", "contact"],
  },
];

/** Compact product brief used as the assistant's frozen system prompt. */
export const PRODUCT_BRIEF = `Stack Emails (stackemails.com) is an email API for developers, similar to Resend. It sends transactional and marketing email through Amazon SES.

Dashboard sections: Overview (KPIs and charts), Emails (Sending, Receiving, Suppressions), Templates, Audience (Contacts, Properties, Segments, Topics), Inboxes, Broadcasts, Automations (Automations, Events), Metrics, Domains, Logs, API keys, Webhooks, Settings (Usage, Billing, Team, SMTP, Integrations, Unsubscribe page, Documents, Labs), Help, Onboarding.

REST API base: https://stackemails.com/v1 — auth with "Authorization: Bearer se_live_<64 hex>".
Key endpoints: POST /v1/emails (from, to, subject, html|text, cc, bcc, reply_to; optional Idempotency-Key header), GET /v1/emails, GET /v1/emails/:id, POST /v1/domains, GET /v1/domains, POST /v1/domains/:id/verify, GET/POST /v1/contacts, GET/POST /v1/segments, POST /v1/broadcasts, POST /v1/events (trigger automations).
Error envelope: {"error":{"code","message"}} with codes like missing_api_key (401), invalid_api_key (401), domain_not_verified (403), validation_error (422), rate_limited (429), quota_exceeded (429).
SDK: npm install stackemails → new StackEmails(key).emails.send({...}). SMTP: smtp.stackemails.com:465/587, user "stackemails", password = API key.

FAQ:
${FAQS.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n")}`;

/** Lightweight keyword retrieval for offline answers and the Help search. */
export function searchFaqs(query: string, limit = 3): Faq[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (!words.length) return [];
  return FAQS.map((f) => {
    const hay = `${f.q} ${f.a} ${f.tags.join(" ")}`.toLowerCase();
    let score = 0;
    for (const w of words) {
      if (f.tags.some((t) => t.includes(w))) score += 3;
      if (f.q.toLowerCase().includes(w)) score += 2;
      if (hay.includes(w)) score += 1;
    }
    return { f, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.f);
}
