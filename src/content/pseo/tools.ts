/** /tools/[slug]: free email DNS tools. The interactive part lives in components/marketing/DnsTools.tsx. */
export type Tool = {
  slug: string;
  name: string;
  widget: "spf" | "dmarc" | "dkim" | "mx" | "spf-generator" | "dmarc-generator";
  metaTitle: string;
  description: string;
  lead: string;
  body: string;
  faq: { q: string; a: string }[];
  related: string[];
  glossary: string[];
};

export const TOOLS: Tool[] = [
  {
    slug: "spf-checker",
    name: "SPF record checker",
    widget: "spf",
    metaTitle: "SPF record checker: free SPF lookup and validator",
    description: "Free SPF checker. Look up any domain's SPF record, count DNS lookups against the 10-lookup limit, see the include tree and get plain-English fixes.",
    lead: "Look up a domain's SPF record, count its DNS lookups against the limit of 10, and get clear fixes for anything that would make SPF fail.",
    body: `## What this SPF checker tests

- **Exactly one SPF record.** Two \`v=spf1\` records make SPF fail with a permanent error.
- **The 10-lookup limit.** Every \`include\`, \`a\`, \`mx\`, \`ptr\`, \`exists\` and \`redirect\` costs a DNS lookup, including the ones nested inside includes. We follow every include and count them all.
- **The all mechanism.** \`+all\` authorises the whole internet; \`?all\` gives no guidance; \`~all\` or \`-all\` are what you want.
- **Deprecated mechanisms** such as \`ptr\`.

## How to fix "too many DNS lookups"

1. Remove includes for services you no longer use.
2. Replace \`a\` and \`mx\` with explicit \`ip4:\` ranges if your servers have fixed IPs.
3. Send marketing or app mail from a subdomain (for example \`mail.acme.com\`) with its own short SPF record. Stack Emails does this by default, so it never adds to your root domain's lookups.

## Next steps

SPF only covers the return-path domain. To protect the From address people see, add [DKIM](/tools/dkim-checker) and a [DMARC policy](/tools/dmarc-checker). Need a record from scratch? Use the [SPF record generator](/tools/spf-generator).`,
    faq: [
      { q: "What is an SPF record?", a: "A DNS TXT record starting with v=spf1 that lists the servers allowed to send email for a domain. Receiving servers compare the sending IP against it." },
      { q: "How many DNS lookups can an SPF record have?", a: "Ten. Includes, a, mx, ptr, exists and redirect mechanisms each count, including those nested inside included records. More than ten causes a permanent error." },
      { q: "Should I use ~all or -all?", a: "~all (soft fail) is the safe default while you set things up. -all (hard fail) is stricter. With DMARC at enforcement, the DMARC policy matters more than the choice between the two." },
      { q: "Can a domain have two SPF records?", a: "No. Merge all senders into a single v=spf1 TXT record; two records make SPF fail for everyone." },
    ],
    related: ["spf-generator", "dmarc-checker", "dkim-checker"],
    glossary: ["spf", "dmarc-alignment", "return-path"],
  },
  {
    slug: "dmarc-checker",
    name: "DMARC checker",
    widget: "dmarc",
    metaTitle: "DMARC checker: free DMARC record lookup and test",
    description: "Free DMARC checker. Look up any domain's DMARC record, see its policy, reporting addresses and alignment settings, and get advice on moving to enforcement.",
    lead: "Check a domain's DMARC record: the policy, where reports go, alignment modes and what to change next, explained in plain English.",
    body: `## What the DMARC checker looks at

- **Whether a record exists** at \`_dmarc.<domain>\`, falling back to the organisational domain the way receivers do.
- **The policy**: \`none\` monitors, \`quarantine\` sends failures to spam, \`reject\` blocks them.
- **Reporting**: a \`rua\` address so you can see who sends as your domain.
- **pct, sp, adkim and aspf** tags, if set.

## Moving from p=none to p=reject

1. Publish \`p=none\` with a \`rua\` address.
2. Read the aggregate reports for two to four weeks. Every legitimate source must pass SPF or DKIM **with alignment**.
3. Fix failing sources by setting up DKIM for your domain in each tool.
4. Switch to \`p=quarantine\` (optionally with \`pct=25\`, then 100), and finally \`p=reject\`.

Gmail and Yahoo require at least \`p=none\` from anyone sending more than 5,000 messages a day to their users. See [Gmail and Yahoo sender requirements](/blog/gmail-yahoo-bulk-sender-requirements).

Need a record? Use the [DMARC record generator](/tools/dmarc-generator).`,
    faq: [
      { q: "What is a DMARC record?", a: "A DNS TXT record at _dmarc.yourdomain.com that tells receivers what to do with email that fails SPF and DKIM alignment, and where to send reports." },
      { q: "Is p=none enough?", a: "It satisfies Gmail's and Yahoo's requirement to have DMARC, and it gives you reports, but it doesn't stop spoofing. Aim for quarantine or reject once all your senders pass." },
      { q: "Why does my mail fail DMARC when SPF passes?", a: "SPF checks the return-path domain. If a service uses its own return path, SPF passes for that domain but doesn't align with your From domain. Set up DKIM for your domain in that service." },
    ],
    related: ["dmarc-generator", "spf-checker", "dkim-checker"],
    glossary: ["dmarc", "dmarc-alignment", "bimi"],
  },
  {
    slug: "dkim-checker",
    name: "DKIM checker",
    widget: "dkim",
    metaTitle: "DKIM checker: free DKIM record lookup and key test",
    description: "Free DKIM checker. Look up a DKIM record by selector or scan common selectors, validate the public key and see its length.",
    lead: "Look up a DKIM public key by selector, or scan the most common selectors, and check that the key is valid and long enough.",
    body: `## Finding your DKIM selector

Open any email you sent, view the original message (in Gmail: **More > Show original**) and find the \`DKIM-Signature\` header. The selector is the \`s=\` value and the domain is \`d=\`:

\`\`\`
DKIM-Signature: v=1; a=rsa-sha256; d=acme.com; s=google; ...
\`\`\`

Common selectors: \`google\` (Google Workspace), \`selector1\` and \`selector2\` (Microsoft 365), \`k1\` (Mailchimp), \`s1\` and \`s2\` (several ESPs). Leave the selector empty and we try more than 20 of them.

## What we check

- The record exists at \`<selector>._domainkey.<domain>\` (CNAME records are followed).
- The \`p=\` public key is present (an empty \`p=\` means the key was revoked).
- The RSA key parses and is at least 1024 bits; 2048 bits is recommended.

DKIM must also **align** with your From domain to count for [DMARC](/tools/dmarc-checker).`,
    faq: [
      { q: "What is a DKIM selector?", a: "A name that lets a domain publish several DKIM keys. The key lives at selector._domainkey.domain, and each signed message names its selector in the s= tag of the DKIM-Signature header." },
      { q: "What DKIM key length should I use?", a: "2048-bit RSA. 1024-bit keys still work but are considered weak, and keys under 1024 bits are rejected by major receivers." },
      { q: "Why does the checker find no DKIM record?", a: "Either the selector is different from the ones scanned, or the record hasn't been published or propagated. Check the s= value in a sent message's DKIM-Signature header." },
    ],
    related: ["dmarc-checker", "spf-checker", "mx-lookup"],
    glossary: ["dkim", "dmarc-alignment", "bimi"],
  },
  {
    slug: "mx-lookup",
    name: "MX lookup",
    widget: "mx",
    metaTitle: "MX lookup: check a domain's MX records and mail provider",
    description: "Free MX record lookup. See which mail servers accept email for any domain, in priority order, and which provider hosts its mailboxes.",
    lead: "See which mail servers accept email for a domain, in priority order, and which provider hosts its mailboxes.",
    body: `## Reading MX results

Each MX record has a **priority** (lower is tried first) and a **mail server** hostname. Senders try the lowest number and fall back to the next if it's unavailable.

## Common problems

- **No MX records**: the domain can't receive email. Some senders fall back to the A record, but don't rely on it.
- **MX points to an IP address**: not allowed. MX must point to a hostname.
- **MX points to a CNAME**: discouraged by the RFCs and rejected by some senders.

Receiving email for an app? Stack Emails gives every team an inbound address and can [receive on your own domain](/features/inbound-email) with one MX record.`,
    faq: [
      { q: "What is an MX record?", a: "A DNS record that names the mail servers accepting email for a domain, each with a priority number. Lower numbers are tried first." },
      { q: "Do I need an MX record to send email?", a: "Not to send from your From address. Receivers use MX records to deliver mail to you. Some sending setups add an MX record on a return-path subdomain to receive bounces." },
    ],
    related: ["spf-checker", "dmarc-checker", "dkim-checker"],
    glossary: ["mx-record", "smtp", "return-path"],
  },
  {
    slug: "spf-generator",
    name: "SPF record generator",
    widget: "spf-generator",
    metaTitle: "SPF record generator: create a valid SPF record in seconds",
    description: "Free SPF record generator. Pick the services that send email for your domain, add your IPs and get a valid v=spf1 TXT record that stays under 10 lookups.",
    lead: "Pick the services that send email for your domain, add any of your own servers, and copy a valid SPF record.",
    body: `## How to publish it

1. Copy the record above.
2. At your DNS provider, create (or edit) a **TXT** record on the root of your domain (host \`@\`). If a \`v=spf1\` record already exists, **replace** it; a domain must have only one.
3. Wait for DNS to update (usually minutes) and confirm with the [SPF checker](/tools/spf-checker).

## Tips

- Only include services that actually send as your domain.
- Prefer sending app and marketing mail from a subdomain with its own SPF record so the root record stays short.
- After SPF, add [DKIM](/tools/dkim-checker) and a [DMARC record](/tools/dmarc-generator).`,
    faq: [
      { q: "Where do I add an SPF record?", a: "As a TXT record on the domain you send from (host @ for the root domain) at your DNS provider, such as Cloudflare, GoDaddy or Namecheap." },
      { q: "How do I add a second email service to SPF?", a: "Add its include: mechanism to your existing record, before the all mechanism. Don't create a second SPF record." },
    ],
    related: ["spf-checker", "dmarc-generator", "dkim-checker"],
    glossary: ["spf", "return-path"],
  },
  {
    slug: "dmarc-generator",
    name: "DMARC record generator",
    widget: "dmarc-generator",
    metaTitle: "DMARC record generator: create a DMARC policy record",
    description: "Free DMARC record generator. Choose a policy, reporting addresses and alignment and copy a valid _dmarc TXT record, with guidance for moving to p=reject.",
    lead: "Choose a policy and reporting address, and copy a valid DMARC TXT record for your domain.",
    body: `## How to publish it

1. Copy the record.
2. At your DNS provider, create a **TXT** record with the host \`_dmarc\` (some providers want \`_dmarc.yourdomain.com\`).
3. Confirm it with the [DMARC checker](/tools/dmarc-checker).

## Recommended rollout

| Stage | Record |
| --- | --- |
| Monitor | \`v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com\` |
| Partial enforcement | \`v=DMARC1; p=quarantine; pct=25; rua=...\` |
| Full enforcement | \`v=DMARC1; p=reject; rua=...\` |

Move to the next stage only when reports show all legitimate mail passing with alignment.`,
    faq: [
      { q: "What should my first DMARC record be?", a: "v=DMARC1; p=none; rua=mailto:you@yourdomain.com. It monitors without affecting delivery and sends you reports." },
      { q: "Where do DMARC reports go?", a: "To the mailto: addresses in the rua tag, as daily XML aggregate reports from receivers such as Gmail, Yahoo and Microsoft." },
    ],
    related: ["dmarc-checker", "spf-generator", "spf-checker"],
    glossary: ["dmarc", "dmarc-alignment"],
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
