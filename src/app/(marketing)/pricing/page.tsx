import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { connectToDatabase } from "@/lib/db/connect";
import { Plan } from "@/lib/db/models";
import { PLAN_LIMITS, fmtLimit, type PlanKey } from "@/lib/plans";
import { CtaBand, Faq, faqLd } from "@/components/marketing/Sections";
import { absUrl, jsonLd, site } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = pageMeta({
  title: "Pricing — free email API, then pay as you grow",
  description: "Stack Emails pricing: free for 3,000 emails a month, Pro at $25/month for 150,000 emails, Scale at $100/month for 1.5 million. No setup fees, no contracts.",
  path: "/pricing",
});

type P = { slug: string; name: string; price: number; monthly: number; daily: number; contacts: number; features: string[] };

const FALLBACK: P[] = [
  { slug: "free", name: "Free", price: 0, monthly: 3000, daily: 100, contacts: 1000, features: [] },
  { slug: "pro", name: "Pro", price: 25, monthly: 150000, daily: 5000, contacts: 50000, features: [] },
  { slug: "scale", name: "Scale", price: 100, monthly: 1500000, daily: 50000, contacts: 500000, features: [] },
];

async function getPlans(): Promise<P[]> {
  try {
    await connectToDatabase();
    const docs = await Plan.find({ isActive: true }).sort({ order: 1, priceMonthly: 1 }).lean();
    if (!docs.length) return FALLBACK;
    return docs.map((d) => ({ slug: d.slug, name: d.name, price: d.priceMonthly, monthly: d.monthlyQuota ?? 0, daily: d.dailyQuota ?? 0, contacts: d.contactsQuota ?? 0, features: d.features ?? [] }));
  } catch {
    return FALLBACK;
  }
}

const BLURB: Record<string, string> = {
  free: "For side projects and trying things out.",
  pro: "For products with real users.",
  scale: "For high-volume senders and teams.",
};

const EVERY_PLAN = ["REST API, SDK & SMTP relay", "DKIM, SPF & DMARC setup", "Automatic bounce & complaint suppression", "Signed webhooks with retries", "Broadcasts, segments & topics", "Inbound email & shared inboxes", "MCP server for AI agents", "30-day logs & analytics"];

const FAQS = [
  { q: "What counts as an email?", a: "Each recipient counts as one email — a message sent to three addresses in the To, Cc and Bcc fields counts as three. Broadcast emails count the same way." },
  { q: "What happens if I reach my limit?", a: "Sends beyond your daily or monthly limit are rejected with a clear quota_exceeded error, and nothing is charged. You'll see usage in the dashboard header and can upgrade at any time." },
  { q: "How do I upgrade?", a: "Go to Settings → Billing in the dashboard and choose a plan. Our team confirms the change by email — usually within a few hours — and your new limits apply immediately." },
  { q: "Is there a contract or setup fee?", a: "No. Plans are month-to-month and you can downgrade at any time." },
  { q: "Do you offer higher volumes?", a: "Yes. If you need more than the Scale plan, contact sales for custom volume pricing." },
  { q: "Is the free plan really free?", a: "Yes — 3,000 emails a month (up to 100 a day), one domain and every core feature. No credit card required." },
];

export default async function PricingPage() {
  const plans = await getPlans();
  const limitRows: { label: string; get: (p: P) => string }[] = [
    { label: "Emails / month", get: (p) => p.monthly.toLocaleString() },
    { label: "Emails / day", get: (p) => p.daily.toLocaleString() },
    { label: "Contacts", get: (p) => p.contacts.toLocaleString() },
    { label: "Domains", get: (p) => fmtLimit(PLAN_LIMITS[(p.slug as PlanKey)]?.domains ?? 1) },
    { label: "Team members", get: (p) => fmtLimit(PLAN_LIMITS[(p.slug as PlanKey)]?.members ?? 3) },
    { label: "Segments", get: (p) => fmtLimit(PLAN_LIMITS[(p.slug as PlanKey)]?.segments ?? 3) },
    { label: "Inboxes", get: (p) => fmtLimit(PLAN_LIMITS[(p.slug as PlanKey)]?.inboxes ?? 3) },
    { label: "Webhook endpoints", get: (p) => fmtLimit(PLAN_LIMITS[(p.slug as PlanKey)]?.webhooks ?? 5) },
    { label: "Log retention", get: (p) => `${PLAN_LIMITS[(p.slug as PlanKey)]?.retentionDays ?? 30} days` },
  ];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: `${site.name} email API`,
        description: site.description,
        brand: { "@type": "Brand", name: site.name },
        url: absUrl("/pricing"),
        offers: plans.map((p) => ({ "@type": "Offer", name: p.name, price: String(p.price), priceCurrency: "USD", url: absUrl("/pricing"), availability: "https://schema.org/InStock" })),
      },
      faqLd(FAQS),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <section className="relative overflow-hidden">
        <div className="m-hero-bg" aria-hidden>
          <span className="m-blob m-blob-a" />
          <span className="m-blob m-blob-b" />
        </div>
        <div className="relative z-[1] m-container pt-32 pb-12 text-center">
        <p className="m-eyebrow">Pricing</p>
        <h1 className="m-display m-h1 mx-auto mt-5 max-w-[16ch]">Simple pricing that <span className="m-highlight">scales with you.</span></h1>
        <p className="m-lead mx-auto mt-6 max-w-[560px]">Start free with every feature. Upgrade when you need more volume — no contracts, no setup fees.</p>
        </div>
      </section>

      <section className="m-container pb-16">
        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {plans.map((p) => {
            const popular = p.slug === "pro";
            return (
              <div key={p.slug} data-reveal className={`m-card m-card-hover m-spot flex flex-col ${popular ? "m-glow-border" : ""}`} style={popular ? { boxShadow: "rgba(115,102,254,.18) 0 20px 40px -12px" } : undefined}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[19px] font-semibold" style={{ color: "var(--m-head)" }}>{p.name}</h2>
                  {popular && <span className="rounded-full px-2.5 py-1 text-[11.5px] font-medium" style={{ background: "var(--m-highlight)", color: "var(--m-head)" }}>Most popular</span>}
                </div>
                <p className="mt-1.5 text-[14px]" style={{ color: "var(--m-muted)" }}>{BLURB[p.slug] ?? ""}</p>
                <p className="m-display mt-6 text-[52px]">${p.price}<span className="text-base font-normal" style={{ color: "var(--m-muted)" }}>/month</span></p>
                <ul className="mt-6 flex-1 space-y-2.5 text-[15px]" style={{ color: "var(--m-text)" }}>
                  <li>✓ {p.monthly.toLocaleString()} emails / month</li>
                  <li>✓ {p.daily.toLocaleString()} emails / day</li>
                  <li>✓ {p.contacts.toLocaleString()} contacts</li>
                  <li>✓ {fmtLimit(PLAN_LIMITS[(p.slug as PlanKey)]?.domains ?? 1)} domain{(PLAN_LIMITS[(p.slug as PlanKey)]?.domains ?? 1) === 1 ? "" : "s"}</li>
                  {p.features.filter((f) => !/emails \/ month|domain/i.test(f) && !/dedicated ip/i.test(f)).map((f) => <li key={f}>✓ {f}</li>)}
                </ul>
                <Link href={p.price === 0 ? "/signup" : `/signup?plan=${p.slug}`} className={`m-btn mt-8 w-full ${popular ? "m-btn-ink" : "m-btn-light"}`}>
                  {p.price === 0 ? "Start for free" : `Choose ${p.name}`}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-[14px]" style={{ color: "var(--m-muted)" }}>
          Need more than {plans.at(-1)?.monthly.toLocaleString()} emails a month? <Link href="/contact?topic=sales" className="m-link">Talk to sales</Link>.
        </p>
      </section>

      <section style={{ background: "var(--m-linen)" }}>
        <div className="m-container py-20">
          <h2 className="m-h2 text-[32px] sm:text-[40px]">Included on every plan</h2>
          <ul className="mt-8 grid gap-x-8 gap-y-4 text-[15px] sm:grid-cols-2 lg:grid-cols-4" style={{ color: "var(--m-text)" }}>
            {EVERY_PLAN.map((f) => <li key={f} className="flex gap-2.5"><span style={{ color: "var(--m-accent)" }}>✓</span>{f}</li>)}
          </ul>

          <div className="mt-14 overflow-x-auto rounded-[22px] border" style={{ borderColor: "var(--m-line)", background: "var(--m-surface)" }}>
            <table className="w-full min-w-[560px] text-left text-[15px]">
              <caption className="sr-only">Plan limits</caption>
              <thead>
                <tr>
                  <th className="px-5 py-4 font-semibold" style={{ color: "var(--m-head)" }}>Limits</th>
                  {plans.map((p) => <th key={p.slug} className="px-5 py-4 font-semibold" style={{ color: "var(--m-head)" }}>{p.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {limitRows.map((r) => (
                  <tr key={r.label} className="border-t" style={{ borderColor: "var(--m-line)" }}>
                    <td className="px-5 py-3.5" style={{ color: "var(--m-muted)" }}>{r.label}</td>
                    {plans.map((p) => <td key={p.slug} className="px-5 py-3.5" style={{ color: "var(--m-head)" }}>{r.get(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Faq items={FAQS} title="Pricing questions" />
      <CtaBand />
    </>
  );
}
