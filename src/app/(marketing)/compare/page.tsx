import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { COMPARISONS } from "@/content/compare";
import { CtaBand, PageHero } from "@/components/marketing/Sections";

export const metadata: Metadata = pageMeta({
  title: "Compare email APIs: Stack Emails alternatives",
  description: "How Stack Emails compares with Resend, SendGrid, Amazon SES, Mailgun and Postmark. Honest and feature by feature.",
  path: "/compare",
});

export default function CompareIndex() {
  return (
    <>
      <PageHero eyebrow="Compare" title="How Stack Emails" highlight="compares." lead="Honest, feature-by-feature comparisons with the email platforms you're probably evaluating." />
      <section className="m-container pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {COMPARISONS.map((c) => (
            <Link key={c.slug} href={`/compare/${c.slug}`} data-reveal className="m-card m-card-hover m-spot block">
              <p className="m-h3">Stack Emails vs {c.name}</p>
              <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{c.summary}</p>
            </Link>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
