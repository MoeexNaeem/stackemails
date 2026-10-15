export interface Snippet {
  lang: string;
  code: string;
}

const emails: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { NanoSend } from "nanosend";

const ns = new NanoSend("ns_live_...");

await ns.emails.send({
  from: "Acme <hello@acme.com>",
  to: ["user@example.com"],
  subject: "Welcome",
  html: "<h1>Hi</h1>",
});`,
  },
  {
    lang: "Python",
    code: `import requests

requests.post(
  "https://api.nanosend.dev/v1/emails",
  headers={"Authorization": "Bearer ns_live_..."},
  json={
    "from": "Acme <hello@acme.com>",
    "to": ["user@example.com"],
    "subject": "Welcome",
    "html": "<h1>Hi</h1>",
  },
)`,
  },
  {
    lang: "cURL",
    code: `curl -X POST https://api.nanosend.dev/v1/emails \\
  -H "Authorization: Bearer ns_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "Acme <hello@acme.com>",
    "to": ["user@example.com"],
    "subject": "Welcome",
    "html": "<h1>Hi</h1>"
  }'`,
  },
];

const domains: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { NanoSend } from "nanosend";
const ns = new NanoSend("ns_live_...");

await ns.domains.create({ name: "acme.com" });
await ns.domains.list();`,
  },
  {
    lang: "cURL",
    code: `curl -X POST https://api.nanosend.dev/v1/domains \\
  -H "Authorization: Bearer ns_live_..." \\
  -d '{ "name": "acme.com" }'`,
  },
];

const apiKeys: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { NanoSend } from "nanosend";
const ns = new NanoSend("ns_live_...");

// Keys are created in the dashboard, then used like:
await ns.emails.send({ /* ... */ });`,
  },
  {
    lang: "cURL",
    code: `curl https://api.nanosend.dev/v1/emails \\
  -H "Authorization: Bearer ns_live_..."`,
  },
];

const audience: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { NanoSend } from "nanosend";
const ns = new NanoSend("ns_live_...");

const audience = await ns.audiences.create({ name: "Newsletter" });
await ns.audiences.addContact(audience.id, { email: "a@example.com" });`,
  },
];

const broadcasts: Snippet[] = [
  {
    lang: "Node.js",
    code: `import { NanoSend } from "nanosend";
const ns = new NanoSend("ns_live_...");

await ns.broadcasts.send({
  audienceId: "aud_123",
  from: "Acme <hello@acme.com>",
  subject: "Newsletter",
  html: "<h1>Hi</h1>",
});`,
  },
];

const webhooks: Snippet[] = [
  {
    lang: "Verify signature (Node.js)",
    code: `import crypto from "node:crypto";

function verify(rawBody, signature, secret) {
  const expected = "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected), Buffer.from(signature)
  );
}`,
  },
];

export const CODE_SNIPPETS: Record<string, Snippet[]> = {
  emails,
  domains,
  "api-keys": apiKeys,
  audience,
  broadcasts,
  webhooks,
};
