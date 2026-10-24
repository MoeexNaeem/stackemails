import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { FEATURES } from "@/content/features";
import { CtaBand, PageHero } from "@/components/marketing/Sections";
import { DashboardMock } from "@/components/marketing/DashboardMock";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = pageMeta({
  title: "Product: email API, broadcasts, inbound, SMTP & webhooks",
  description: "Everything Stack Emails does: transactional email API, broadcasts and audiences, inbound email and shared inboxes, SMTP relay, signed webhooks and an MCP server for AI agents.",
  path: "/features",
});

const EXTRAS = [
  ["Domains & DNS", "DKIM, return-path and DMARC records generated per domain, with automatic re-verification."],
  ["Templates", "Save reusable HTML templates with variables and preview them safely in a sandbox."],
  ["Automations", "Trigger multi-step sequences from contact events and custom events sent from your app."],
  ["Metrics", "Delivery, open, click, bounce and complaint rates over time, per domain."],
  ["Teams & roles", "Invite teammates as admins or members, switch between teams, and protect accounts with two-factor authentication."],
  ["Exports", "Download emails, contacts, suppressions and logs as CSV at any time."],
];

export default function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Product" title="One platform for every email" highlight="your product sends." lead="From a password reset to a product newsletter to a reply from a customer, Stack Emails handles sending, receiving and everything in between.">
        <Link href="/signup" className="m-btn m-btn-ink">Start for free</Link>
        <Link href="/pricing" className="m-btn m-btn-light">See pricing</Link>
      </PageHero>

      <section className="m-container pb-20">
        <div className="grid gap-5 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Link key={f.slug} href={`/features/${f.slug}`} data-reveal className="m-card m-card-hover m-spot group block" style={{ "--d": `${(i % 2) * 90}ms` } as React.CSSProperties}>
              <p className="m-eyebrow">{f.name}</p>
              <h2 className="m-h3 mt-3 text-[24px]">{f.h1} {f.highlight}</h2>
              <p className="m-body mt-3" style={{ color: "var(--m-muted)" }}>{f.lead}</p>
              <p className="mt-5 text-sm font-medium" style={{ color: "var(--m-ink)" }}>Explore {f.name.toLowerCase()} <Icon name="arrow-right" size={14} /></p>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ background: "var(--m-linen)" }}>
        <div className="m-container py-20">
          <h2 className="m-h2 max-w-[20ch]">And the dashboard to run it all.</h2>
          <div data-reveal="zoom" className="mt-10"><div className="m-tilt"><DashboardMock /></div></div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {EXTRAS.map(([t, b], i) => (
              <div key={t} data-reveal style={{ "--d": `${(i % 3) * 90}ms` } as React.CSSProperties}>
                <p className="font-semibold" style={{ color: "var(--m-head)" }}>{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
