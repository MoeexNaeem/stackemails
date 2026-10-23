import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { CtaBand, PageHero } from "@/components/marketing/Sections";
import { absUrl, jsonLd, site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "About",
  description: "Stack Emails is building the email platform we always wanted: simple for developers, honest about deliverability, and fair on price.",
  path: "/about",
});

const VALUES = [
  ["Developers first", "A clean API, real error messages and docs you can read in one sitting. If it takes more than five minutes to send your first email, we've failed."],
  ["Deliverability is the product", "Authentication, suppression and unsubscribes aren't upsells. They're on by default for everyone, because they decide whether your email arrives."],
  ["Honest by default", "We publish what we do and don't do. No fake badges, no inflated numbers, no hidden overage fees."],
  ["Fair pricing", "A generous free plan, simple monthly tiers and no surprise bills — when you reach your limit, sends pause instead of piling up charges."],
];

export default function AboutPage() {
  const ld = { "@context": "https://schema.org", "@type": "AboutPage", url: absUrl("/about"), name: `About ${site.name}`, mainEntity: { "@id": absUrl("/#organization") } };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <PageHero eyebrow="About" title="We're building the email platform" highlight="we always wanted." lead="Every product sends email. Most teams still lose hours to DNS records, mysterious spam-folder placement and dashboards that hide what happened to a message. Stack Emails exists to make email boring — in the best way." />

      <section className="m-container pb-20">
        <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {VALUES.map(([t, b]) => (
            <div key={t} className="border-t pt-6" style={{ borderColor: "var(--m-line)" }}>
              <h2 className="m-h3">{t}</h2>
              <p className="m-body mt-3" style={{ color: "var(--m-muted)" }}>{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: "var(--m-linen)" }}>
        <div className="m-container grid gap-10 py-20 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="m-h2 text-[32px] sm:text-[40px]">What we run on</h2>
          <div className="m-body space-y-4" style={{ color: "var(--m-text)" }}>
            <p>Stack Emails delivers through <strong>Amazon SES</strong>, one of the most reliable sending networks in the world. On top of it we've built the parts teams usually have to assemble themselves: per-email timelines, signed webhooks, suppression lists, contacts and broadcasts, inbound inboxes and an MCP server for AI agents.</p>
            <p>Want to talk? <Link href="/contact" className="m-link">Get in touch</Link> — a real person reads every message.</p>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
