import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth/session";

const CODE_SAMPLE = `import { NanoSend } from "nanosend";

const ns = new NanoSend("ns_live_...");

await ns.emails.send({
  from: "Acme <hello@acme.com>",
  to: ["user@example.com"],
  subject: "Welcome to Acme 👋",
  html: "<h1>You're in.</h1>",
});`;

const FEATURES = [
  {
    title: "REST API & typed SDKs",
    body: "Clean endpoints for sending email, verifying domains, and streaming events. Sub-50ms ingestion, always.",
    icon: "M4 7h16M4 12h10M4 17h7",
  },
  {
    title: "Automated domain auth",
    body: "One click generates your SPF + DKIM records. We delegate straight to Amazon SES — no IAM policies to touch.",
    icon: "M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z",
  },
  {
    title: "Real-time webhooks",
    body: "Signed HMAC event streams for deliveries, bounces, complaints, opens, and domain verification.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "React Email native",
    body: "Render your components to HTML at the edge. Ship beautiful, on-brand email with the tools you already use.",
    icon: "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z",
  },
  {
    title: "Queue-based delivery",
    body: "Every send is decoupled through a durable queue with idempotency and exponential-backoff retries.",
    icon: "M4 6h16M4 12h16M4 18h16",
  },
  {
    title: "Multi-tenant workspaces",
    body: "Isolated environments, per-workspace secrets, and scoped API keys. Built for agencies from day one.",
    icon: "M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col min-h-full">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/80 backdrop-blur-xl bg-bg/70">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/docs" className="btn btn-ghost hidden sm:inline-flex">
              Docs
            </Link>
            {user ? (
              <Link href="/emails" className="btn btn-primary">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary">
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(600px circle at 20% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(600px circle at 90% 20%, rgba(139,92,246,0.12), transparent 55%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="badge" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-strong)", color: "var(--fg-muted)" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
              Powered by Amazon SES
            </span>
            <h1 className="mt-5 text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
              The email API
              <br />
              for <span style={{ color: "var(--accent)" }}>developers</span>.
            </h1>
            <p className="mt-5 text-lg text-fg-muted max-w-md">
              Send transactional and marketing email with deliverability you can
              trust. Modern REST APIs, native React Email, and real-time
              webhooks — without the AWS boilerplate.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary px-5 py-2.5 text-base">
                Start sending free
              </Link>
              <Link href="/docs" className="btn btn-secondary px-5 py-2.5 text-base">
                Read the docs
              </Link>
            </div>
            <p className="mt-4 text-sm text-fg-subtle">
              3,000 emails/mo free · No credit card required
            </p>
          </div>

          {/* Code card */}
          <div className="card overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <span className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
              <span className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
              <span className="ml-2 text-xs text-fg-subtle mono">send.ts</span>
            </div>
            <pre className="mono text-[13px] leading-relaxed p-5 overflow-x-auto">
              <code>{CODE_SAMPLE}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-3xl font-semibold tracking-tight text-center">
          Everything you need to ship email
        </h2>
        <p className="mt-3 text-fg-muted text-center max-w-2xl mx-auto">
          NanoSend abstracts away SES complexity into a beautifully simple
          platform — so you can integrate in under five minutes.
        </p>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 hover:bg-bg-hover transition-colors">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={f.icon} />
                </svg>
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="card p-10 sm:p-14 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-70"
            style={{ background: "radial-gradient(500px circle at 50% 0%, rgba(99,102,241,0.15), transparent 60%)" }}
          />
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Send your first email today
          </h2>
          <p className="mt-3 text-fg-muted max-w-lg mx-auto">
            Create an account, verify a domain, and call the API — all in less
            than five minutes.
          </p>
          <Link href="/signup" className="btn btn-primary mt-8 px-6 py-3 text-base">
            Get started for free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-fg-subtle">
          <Logo size={22} />
          <p>© {new Date().getFullYear()} NanoSend. Built on Amazon SES.</p>
        </div>
      </footer>
    </div>
  );
}
