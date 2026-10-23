import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { DashboardMock } from "@/components/marketing/DashboardMock";
import { CodeShowcase } from "@/components/marketing/CodeShowcase";
import { CountUp } from "@/components/marketing/Motion";
import { FAQS } from "@/lib/knowledge";
import { absUrl, jsonLd, site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Stack Emails — The email API for developers",
  description: "Send transactional and marketing email with one clean API. Verified domains, real-time webhooks, broadcasts, inbound inboxes and an MCP server for AI agents — built on Amazon SES. Free up to 3,000 emails a month.",
  path: "/",
  absoluteTitle: true,
});

const FEATURES = [
  { title: "Email API & SDKs", body: "One REST endpoint, idempotent sends, batch and scheduled delivery, attachments and tags. Typed Node.js SDK plus snippets for 10 languages.", href: "/features/transactional-email", icon: "M4 7h16M4 12h10M4 17h7" },
  { title: "Deliverability built in", body: "DKIM, SPF and DMARC records generated for you, automatic suppression of bounces and complaints, and one-click unsubscribe headers Gmail requires.", href: "/blog/email-deliverability-guide", icon: "M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" },
  { title: "Broadcasts & audiences", body: "Contacts, segments, custom properties and subscription topics. Personalise with merge tags and schedule campaigns to the minute.", href: "/features/marketing-email", icon: "M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M6 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
  { title: "Inbound & shared inboxes", body: "Receive email on your domain or a free address, thread conversations, and reply from shared team inboxes.", href: "/features/inbound-email", icon: "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" },
  { title: "Webhooks that don't drop", body: "Signed, timestamped events for every delivery, open, click, bounce and inbound message — retried with backoff for up to six attempts.", href: "/features/email-webhooks", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { title: "Built for AI agents", body: "A native MCP server lets Claude, Cursor and other agents send email, check delivery and manage contacts with your API key.", href: "/features/mcp-server", icon: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" },
];

const FACTS = [
  { value: "3,000", label: "free emails every month, no card required" },
  { value: "10", label: "languages with copy-paste quickstarts" },
  { value: "6×", label: "webhook delivery attempts with backoff" },
  { value: "30 days", label: "of email logs and analytics on every plan" },
];

const STACK = ["Next.js", "React", "Node.js", "Bun", "Python", "Django", "Laravel", "Ruby on Rails", "Go", "Rust", ".NET", "Elixir", "Supabase", "Vercel", "WordPress", "React Email", "Claude", "Cursor"];

const PIPELINE = [
  { title: "API call", body: "POST /v1/emails from your app, SDK, SMTP or an AI agent.", icon: "M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" },
  { title: "Checks", body: "Verified sender, quota, suppression list and idempotency.", icon: "M9 12l2 2 4-4M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" },
  { title: "Queue", body: "Durable queue with retries and scheduled delivery.", icon: "M4 6h16M4 12h16M4 18h10" },
  { title: "Delivery", body: "DKIM-signed and sent through Amazon SES.", icon: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" },
  { title: "Events", body: "Delivered, opened or bounced — pushed to your webhook.", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
];

const HOME_FAQ = FAQS.filter((f) => ["How do I send my first email?", "How do I keep my emails out of spam?", "What plans do you offer?", "Can I receive emails?", "Can I use Stack Emails with AI agents (MCP)?", "How do webhooks work and how do I verify them?"].includes(f.q));

export default function HomePage() {
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": absUrl("/#software"),
        name: site.name,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Web",
        url: site.url,
        description: site.description,
        offers: [
          { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
          { "@type": "Offer", name: "Pro", price: "25", priceCurrency: "USD" },
          { "@type": "Offer", name: "Scale", price: "100", priceCurrency: "USD" },
        ],
        publisher: { "@id": absUrl("/#organization") },
      },
      {
        "@type": "FAQPage",
        mainEntity: HOME_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="m-hero-bg" aria-hidden>
          <span className="m-blob m-blob-a" />
          <span className="m-blob m-blob-b" />
          <span className="m-blob m-blob-c" />
        </div>

        <div className="relative z-[1] m-container pt-32 pb-14 text-center sm:pt-40">
          <div className="m-enter">
            <Link href="/changelog" className="m-pill">
              New · Inboxes &amp; an MCP server for AI agents <span aria-hidden>→</span>
            </Link>
          </div>
          <h1 className="m-enter m-display m-h1 mx-auto mt-8 max-w-[15ch]" style={{ "--d": "80ms" } as React.CSSProperties}>
            Email for developers, <span className="m-highlight">done right.</span>
          </h1>
          <p className="m-enter m-lead mx-auto mt-7 max-w-[600px]" style={{ "--d": "160ms" } as React.CSSProperties}>
            Send transactional and marketing email with one clean API. Verified domains, real-time webhooks and deliverability tooling — so your emails land in the inbox, not the spam folder.
          </p>
          <div className="m-enter mt-9 flex flex-wrap items-center justify-center gap-3" style={{ "--d": "240ms" } as React.CSSProperties}>
            <Link href="/signup" className="m-btn m-btn-ink">Start for free</Link>
            <Link href="/docs" className="m-btn m-btn-light">Read the docs</Link>
          </div>
          <p className="m-enter mt-4 text-sm" style={{ color: "var(--m-faint)", "--d": "320ms" } as React.CSSProperties}>3,000 emails/month free · No credit card · Built on Amazon SES</p>
        </div>

        <div className="relative z-[1] m-container pb-16">
          <div className="m-enter" style={{ "--d": "380ms" } as React.CSSProperties}>
            <div className="m-tilt rounded-[34px] p-3 sm:p-5" style={{ background: "var(--m-hero-grad)" }}>
              <DashboardMock />
            </div>
          </div>
        </div>
      </section>

      {/* Works with */}
      <section className="pb-16" aria-label="Works with your stack">
        <p className="text-center text-[13px] font-medium" style={{ color: "var(--m-faint)" }}>Works with the tools you already use</p>
        <div className="m-marquee mt-5">
          <div className="m-marquee-track">
            {[...STACK, ...STACK].map((s, i) => (
              <span key={i} aria-hidden={i >= STACK.length || undefined} className="whitespace-nowrap rounded-full border px-4 py-2 text-[14px] font-medium" style={{ borderColor: "var(--m-line)", color: "var(--m-text)", background: "var(--m-surface)" }}>{s}</span>
            ))}
          </div>
        </div>
      </section>

      <div className="m-container"><div className="m-divider" /></div>

      {/* Statement */}
      <section className="m-container py-20">
        <p data-reveal className="m-eyebrow">Why Stack Emails</p>
        <h2 data-reveal className="m-h2 mt-4 max-w-[22ch]" style={{ "--d": "80ms" } as React.CSSProperties}>Everything between your code and the <span className="m-shimmer">inbox</span> — in one place.</h2>
        <p data-reveal className="m-lead mt-6 max-w-[680px]" style={{ "--d": "160ms" } as React.CSSProperties}>
          Most email APIs stop at “accepted”. Stack Emails takes care of what happens next: authentication, bounce handling, suppression, unsubscribes, analytics and the webhooks your product needs to react in real time.
        </p>
      </section>

      {/* Features */}
      <section className="m-container pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Link key={f.title} href={f.href} data-reveal className="m-card m-card-hover m-spot group block" style={{ "--d": `${(i % 3) * 90}ms` } as React.CSSProperties}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" style={{ background: "var(--m-highlight)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--m-accent-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={f.icon} /></svg>
              </span>
              <h3 className="m-h3 mt-5">{f.title}</h3>
              <p className="m-body mt-2" style={{ color: "var(--m-muted)" }}>{f.body}</p>
              <p className="mt-4 text-sm font-medium transition-transform group-hover:translate-x-1" style={{ color: "var(--m-ink)" }}>Learn more →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Pipeline: request → inbox */}
      <section className="relative overflow-hidden" style={{ background: "var(--m-linen)" }}>
        <div className="m-container py-24">
          <div className="text-center">
            <p data-reveal className="m-eyebrow">How it works</p>
            <h2 data-reveal className="m-h2 mx-auto mt-4 max-w-[20ch]" style={{ "--d": "80ms" } as React.CSSProperties}>From one API call to the inbox in about a second.</h2>
          </div>
          <div data-reveal className="relative mt-16" style={{ "--d": "160ms" } as React.CSSProperties}>
            <div className="m-pipe-line absolute left-[10%] right-[10%] top-7 hidden h-px md:block" aria-hidden>
              <span className="m-pipe-dot" />
            </div>
            <ol className="relative grid gap-8 md:grid-cols-5">
              {PIPELINE.map((s, i) => (
                <li key={s.title} className="text-center">
                  <span className="relative z-[1] mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border text-[20px] shadow-sm" style={{ background: "var(--m-surface)", borderColor: "var(--m-line)", color: "var(--m-accent-ink)" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={s.icon} /></svg>
                  </span>
                  <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--m-faint)" }}>Step {i + 1}</p>
                  <p className="mt-1 font-semibold" style={{ color: "var(--m-head)" }}>{s.title}</p>
                  <p className="mx-auto mt-1.5 max-w-[24ch] text-[14px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Code band (dark) */}
      <section className="relative overflow-hidden" style={{ background: "var(--m-dark)", "--m-grid-line": "rgba(255,255,255,0.045)" } as React.CSSProperties}>
        <div className="m-hero-bg" aria-hidden>
          <span className="m-orb" style={{ width: 520, height: 520, right: -140, top: -120, background: "rgba(115,102,254,0.35)" }} />
          <span className="m-orb" style={{ width: 380, height: 380, left: -120, bottom: -160, background: "rgba(209,255,25,0.14)", animationDelay: "-4s" }} />
        </div>
        <div className="relative z-[1] m-container grid items-center gap-12 py-24 lg:grid-cols-2">
          <div>
            <p data-reveal className="text-xs font-medium uppercase tracking-[0.16em]" style={{ color: "var(--m-lime)" }}>Developer experience</p>
            <h2 data-reveal className="mt-4 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[48px]" style={{ "--d": "80ms" } as React.CSSProperties}>Send your first email in under a minute.</h2>
            <p data-reveal className="mt-6 max-w-[520px] text-[17px] leading-relaxed" style={{ color: "#94a3b8", "--d": "160ms" } as React.CSSProperties}>
              A single POST with a JSON body. Typed SDK for Node.js and Next.js, React Email support, idempotency keys for safe retries, and errors that tell you exactly what to fix.
            </p>
            <ul className="mt-8 space-y-3 text-[15px]" style={{ color: "#cbd5e1" }}>
              {["Batch up to 100 emails per request", "Schedule sends up to 30 days ahead", "SMTP relay for tools that only speak SMTP", "Request logs with bodies for every call"].map((t, i) => (
                <li key={t} data-reveal className="flex items-center gap-3" style={{ "--d": `${200 + i * 80}ms` } as React.CSSProperties}><span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--m-lime)" }} />{t}</li>
              ))}
            </ul>
            <div className="mt-9 flex gap-3">
              <Link href="/signup" className="m-btn m-btn-lime">Get an API key</Link>
              <Link href="/docs" className="m-btn" style={{ color: "#fff", border: "1px solid #334155" }}>API reference</Link>
            </div>
          </div>
          <div data-reveal="zoom" style={{ "--d": "120ms" } as React.CSSProperties}>
            <CodeShowcase />
            <div className="mt-3 flex items-center gap-2 rounded-2xl border px-4 py-3 text-[13px]" style={{ borderColor: "#262a30", background: "#111316", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "#4ade80" }}>202 Accepted</span>
              <span className="truncate">{'{ "id": "msg_5b1f0c6c2a8e", "status": "queued" }'}</span>
              <span className="m-caret ml-auto shrink-0" aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* Facts band */}
      <section style={{ background: "var(--m-linen)" }}>
        <div className="m-container grid gap-10 py-20 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f, i) => (
            <div key={f.label} data-reveal style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
              <p className="m-display text-[52px] sm:text-[64px]"><CountUp value={f.value} /></p>
              <p className="m-body mt-2 max-w-[22ch]" style={{ color: "var(--m-muted)" }}>{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Deliverability */}
      <section className="m-container grid items-center gap-14 py-24 lg:grid-cols-2">
        <div>
          <p data-reveal className="m-eyebrow">Deliverability</p>
          <h2 data-reveal className="m-h2 mt-4" style={{ "--d": "80ms" } as React.CSSProperties}>Land in the inbox — and stay there.</h2>
          <p data-reveal className="m-lead mt-6" style={{ "--d": "160ms" } as React.CSSProperties}>Your sender reputation is your product&apos;s reputation. Stack Emails enforces the practices inbox providers reward, automatically.</p>
          <div data-reveal className="m-card mt-8 max-w-md !p-5" style={{ "--d": "240ms" } as React.CSSProperties} aria-label="Example authentication results">
            <p className="text-[12px] font-medium uppercase tracking-[0.14em]" style={{ color: "var(--m-faint)" }}>Authentication-Results</p>
            <ul className="mt-3 space-y-2.5 text-[14px]" style={{ fontFamily: "var(--font-mono)" }}>
              {["spf=pass", "dkim=pass (2048-bit)", "dmarc=pass", "list-unsubscribe=one-click"].map((r, i) => (
                <li key={r} className="flex items-center justify-between gap-4">
                  <span style={{ color: "var(--m-head)" }}>{r}</span>
                  <span className="m-check rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "rgba(34,197,94,.14)", color: "#16a34a", "--i": i } as React.CSSProperties}>PASS</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Authenticated by default", "Easy DKIM (2048-bit), SPF on a custom return path and a starter DMARC policy for every domain."],
            ["Automatic suppression", "Hard bounces and spam complaints are suppressed so you never mail them again."],
            ["One-click unsubscribe", "RFC 8058 List-Unsubscribe headers and a hosted preference page on every marketing email."],
            ["Health at a glance", "Bounce and complaint rates tracked against the thresholds Gmail and Yahoo enforce."],
          ].map(([t, b], i) => (
            <div key={t} data-reveal className="m-card m-spot" style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
              <p className="font-semibold" style={{ color: "var(--m-head)" }}>{t}</p>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="relative overflow-hidden" style={{ background: "var(--m-linen)" }}>
        <div className="m-container py-24 text-center">
          <p data-reveal className="m-eyebrow">Pricing</p>
          <h2 data-reveal className="m-h2 mx-auto mt-4 max-w-[18ch]" style={{ "--d": "80ms" } as React.CSSProperties}>Start free. Pay as you grow.</h2>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 text-left md:grid-cols-3">
            {[
              ["Free", "$0", "3,000 emails / month", "100 / day · 1 domain"],
              ["Pro", "$25", "150,000 emails / month", "5,000 / day · 10 domains"],
              ["Scale", "$100", "1.5M emails / month", "50,000 / day · unlimited domains"],
            ].map(([n, p, a, b], i) => (
              <div key={n} data-reveal className={`m-card m-card-hover ${i === 1 ? "m-glow-border" : ""}`} style={{ "--d": `${i * 100}ms`, ...(i === 1 ? { boxShadow: "rgba(115,102,254,.18) 0 20px 40px -12px" } : {}) } as React.CSSProperties}>
                <div className="flex items-center justify-between">
                  <p className="font-semibold" style={{ color: "var(--m-head)" }}>{n}</p>
                  {i === 1 && <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: "var(--m-highlight)", color: "var(--m-head)" }}>Popular</span>}
                </div>
                <p className="m-display mt-3 text-[44px]">{p}<span className="text-base font-normal" style={{ color: "var(--m-muted)" }}>/mo</span></p>
                <p className="mt-3 text-[15px]" style={{ color: "var(--m-text)" }}>{a}</p>
                <p className="text-sm" style={{ color: "var(--m-muted)" }}>{b}</p>
              </div>
            ))}
          </div>
          <Link href="/pricing" className="m-btn m-btn-ink mt-10">Compare plans</Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="m-container py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div data-reveal>
            <p className="m-eyebrow">FAQ</p>
            <h2 className="m-h2 mt-4">Questions, answered.</h2>
            <p className="m-lead mt-6">Can&apos;t find what you need? <Link href="/contact" className="m-link">Talk to us</Link>.</p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--m-line)" }}>
            {HOME_FAQ.map((f, i) => (
              <details key={f.q} data-reveal className="group py-5" style={{ borderColor: "var(--m-line)", "--d": `${i * 60}ms` } as React.CSSProperties}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[17px] font-semibold transition-colors hover:text-[var(--m-accent)]" style={{ color: "var(--m-head)" }}>
                  {f.q}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-lg transition-transform duration-300 group-open:rotate-45" style={{ color: "var(--m-faint)", borderColor: "var(--m-line)" }}>+</span>
                </summary>
                <p className="m-body mt-3" style={{ color: "var(--m-muted)" }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="m-container pb-24">
        <div data-reveal="zoom" className="m-glow-border relative overflow-hidden rounded-[32px] px-8 py-16 text-center sm:px-16" style={{ background: "var(--m-dark)", border: "1px solid var(--m-dark-line)" }}>
          <div className="m-hero-bg" aria-hidden style={{ "--m-grid-line": "rgba(255,255,255,0.05)" } as React.CSSProperties}>
            <span className="m-orb" style={{ width: 560, height: 560, left: "50%", bottom: -380, marginLeft: -280, background: "rgba(115,102,254,0.55)" }} />
          </div>
          <h2 className="relative mx-auto max-w-[18ch] text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[52px]">Ship email your users actually receive.</h2>
          <p className="relative mx-auto mt-5 max-w-[520px] text-[17px]" style={{ color: "#94a3b8" }}>Create a free account, verify your domain and send in minutes.</p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="m-btn m-btn-lime">Start for free</Link>
            <Link href="/contact?topic=sales" className="m-btn" style={{ color: "#fff", border: "1px solid #334155" }}>Talk to sales</Link>
          </div>
        </div>
      </section>
    </>
  );
}
