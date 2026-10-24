import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPARISONS, REVIEWED, comparisonBySlug } from "@/content/compare";
import { CtaBand, PageHero, breadcrumbLd } from "@/components/marketing/Sections";
import { absUrl, jsonLd, site } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = comparisonBySlug((await params).slug);
  if (!c) return {};
  return pageMeta({ title: c.metaTitle, description: c.metaDescription, path: `/compare/${c.slug}` });
}

export default async function ComparePage({ params }: Props) {
  const c = comparisonBySlug((await params).slug);
  if (!c) notFound();

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", url: absUrl(`/compare/${c.slug}`), name: c.metaTitle, description: c.metaDescription, isPartOf: { "@id": absUrl("/#website") } },
      breadcrumbLd([
        { name: site.name, url: site.url },
        { name: "Compare", url: absUrl("/compare") },
        { name: `vs ${c.name}`, url: absUrl(`/compare/${c.slug}`) },
      ]),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <PageHero eyebrow="Compare" title={`Stack Emails vs ${c.name}`} lead={c.summary}>
        <Link href="/signup" className="m-btn m-btn-ink">Try Stack Emails free</Link>
        <Link href="/docs" className="m-btn m-btn-light">Read the docs</Link>
      </PageHero>

      <section className="m-container pb-16">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="m-card">
            <h2 className="text-[17px] font-semibold" style={{ color: "var(--m-head)" }}>Where {c.name} shines</h2>
            <ul className="mt-4 space-y-3">
              {c.theyShine.map((t) => <li key={t} className="flex gap-3 text-[15px]" style={{ color: "var(--m-text)" }}><span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--m-faint)" }} />{t}</li>)}
            </ul>
          </div>
          <div className="m-card" style={{ borderColor: "var(--m-ink)" }}>
            <h2 className="text-[17px] font-semibold" style={{ color: "var(--m-head)" }}>Where Stack Emails is different</h2>
            <ul className="mt-4 space-y-3">
              {c.weDiffer.map((t) => <li key={t} className="flex gap-3 text-[15px]" style={{ color: "var(--m-text)" }}><Icon name="check" size={17} className="mt-[3px]" style={{ color: "var(--m-accent)" }} />{t}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="m-container pb-16">
        <h2 className="m-h2 text-[32px]">Feature by feature</h2>
        <div className="mt-8 overflow-x-auto rounded-[22px] border" style={{ borderColor: "var(--m-line)" }}>
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <thead style={{ background: "var(--m-linen)" }}>
              <tr>
                <th className="px-5 py-3.5 font-semibold" style={{ color: "var(--m-head)" }}>Capability</th>
                <th className="px-5 py-3.5 font-semibold" style={{ color: "var(--m-head)" }}>Stack Emails</th>
                <th className="px-5 py-3.5 font-semibold" style={{ color: "var(--m-head)" }}>{c.name}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.label} className="border-t" style={{ borderColor: "var(--m-line)" }}>
                  <td className="px-5 py-3.5" style={{ color: "var(--m-text)" }}>{r.label}</td>
                  <td className="px-5 py-3.5 font-medium" style={{ color: "var(--m-head)" }}>{r.us}</td>
                  <td className="px-5 py-3.5" style={{ color: "var(--m-muted)" }}>{r.them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px]" style={{ color: "var(--m-faint)" }}>
          Last reviewed {REVIEWED} from public documentation. Products change. Check {c.name}&apos;s website for current features and pricing. “Check vendor” means we couldn&apos;t confirm it from public docs.
        </p>
      </section>

      <section style={{ background: "var(--m-linen)" }}>
        <div className="m-container grid gap-8 py-16 lg:grid-cols-[1fr_1.5fr]">
          <h2 className="m-h2 text-[32px]">Switching from {c.name}</h2>
          <div>
            <p className="m-lead">{c.migrate}</p>
            <Link href="/docs/quickstart" className="m-btn m-btn-ink mt-6">Follow the quickstart</Link>
          </div>
        </div>
      </section>

      <section className="m-container py-16">
        <p className="text-sm font-semibold" style={{ color: "var(--m-head)" }}>Other comparisons</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {COMPARISONS.filter((x) => x.slug !== c.slug).map((x) => (
            <Link key={x.slug} href={`/compare/${x.slug}`} className="m-btn m-btn-light m-btn-sm">vs {x.name}</Link>
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
