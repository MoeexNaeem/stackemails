import Link from "next/link";
import { Logo } from "@/components/Logo";

const CURL = `curl -X POST https://api.nanosend.dev/v1/emails \\
  -H "Authorization: Bearer ns_live_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "from": "Acme <hello@acme.com>",
    "to": ["user@example.com"],
    "subject": "Welcome to our platform",
    "html": "<h1>Welcome</h1>"
  }'`;

const RESPONSE = `HTTP/1.1 202 Accepted
{
  "id": "msg_9f8e7d6c",
  "status": "queued"
}`;

const VERIFY = `import crypto from "node:crypto";

function verify(rawBody, signatureHeader, secret) {
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret)
      .update(rawBody).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected), Buffer.from(signatureHeader)
  );
}`;

function Code({ children }: { children: string }) {
  return (
    <pre className="card mono text-[13px] leading-relaxed p-4 overflow-x-auto my-4">
      <code>{children}</code>
    </pre>
  );
}

const ENDPOINTS = [
  { method: "POST", path: "/v1/emails", desc: "Queue an email for delivery. Returns 202." },
  { method: "GET", path: "/v1/emails", desc: "List recent emails (newest first)." },
  { method: "GET", path: "/v1/emails/:id", desc: "Retrieve one email and its event timeline." },
  { method: "POST", path: "/v1/domains", desc: "Register a domain; returns DNS records to add." },
  { method: "GET", path: "/v1/domains", desc: "List registered domains and their status." },
  { method: "POST", path: "/v1/domains/:id/verify", desc: "Re-check verification with SES." },
];

export default function DocsPage() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-border backdrop-blur-xl bg-bg/70">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Get started
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-4xl font-semibold tracking-tight">Documentation</h1>
        <p className="mt-3 text-fg-muted">
          Send your first email in under five minutes. Base URL:{" "}
          <code className="mono text-accent">/v1</code>.
        </p>

        <h2 className="text-2xl font-semibold mt-12 mb-2">1. Authentication</h2>
        <p className="text-fg-muted">
          Create an API key in the dashboard and pass it as a bearer token. Keys look like{" "}
          <code className="mono text-accent">ns_live_…</code> and are shown only once.
        </p>

        <h2 className="text-2xl font-semibold mt-12 mb-2">2. Send an email</h2>
        <p className="text-fg-muted">
          The API accepts your request, enqueues it, and returns immediately — delivery happens
          asynchronously through Amazon SES.
        </p>
        <Code>{CURL}</Code>
        <p className="text-fg-muted">Response:</p>
        <Code>{RESPONSE}</Code>
        <p className="text-fg-muted text-sm">
          Pass an optional <code className="mono text-accent">Idempotency-Key</code> header to make
          retries safe — the same key always returns the original message.
        </p>

        <h2 className="text-2xl font-semibold mt-12 mb-2">3. Verify webhook signatures</h2>
        <p className="text-fg-muted">
          Every webhook includes an{" "}
          <code className="mono text-accent">X-NanoSend-Signature</code> header. Verify it with your
          workspace signing secret:
        </p>
        <Code>{VERIFY}</Code>

        <h2 className="text-2xl font-semibold mt-12 mb-4">API reference</h2>
        <div className="card divide-y divide-border overflow-hidden">
          {ENDPOINTS.map((e) => (
            <div key={e.method + e.path} className="flex items-center gap-3 px-4 py-3">
              <span
                className="badge shrink-0 w-14 justify-center"
                style={{
                  color: e.method === "GET" ? "var(--info)" : "var(--success)",
                  background: `color-mix(in srgb, ${e.method === "GET" ? "var(--info)" : "var(--success)"} 14%, transparent)`,
                }}
              >
                {e.method}
              </span>
              <code className="mono text-sm">{e.path}</code>
              <span className="text-sm text-fg-muted ml-auto text-right hidden sm:block">
                {e.desc}
              </span>
            </div>
          ))}
        </div>

        <div className="card p-6 mt-12 text-center">
          <p className="font-medium">Ready to send?</p>
          <Link href="/signup" className="btn btn-primary mt-4">
            Create your account
          </Link>
        </div>
      </article>
    </div>
  );
}
