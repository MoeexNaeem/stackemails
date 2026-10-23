import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES, featureBySlug } from "@/content/features";
import { CodeBlock, CtaBand, Faq, PageHero, breadcrumbLd, faqLd } from "@/components/marketing/Sections";
import { absUrl, jsonLd, site } from "@/lib/site";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const f = featureBySlug((await params).slug);
  if (!f) return {};
  return pageMeta({ title: f.metaTitle, description: f.metaDescription, path: `/features/${f.slug}` });
}

export default async function FeaturePage({ params }: Props) {
  const f = featureBySlug((await params).slug);
  if (!f) notFound();
  const related = f.related.map(featureBySlug).filter(Boolean);

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        url: absUrl(`/features/${f.slug}`),
        name: f.metaTitle,
        description: f.metaDescription,
        isPartOf: { "@id": absUrl("/#website") },
        about: { "@id": absUrl("/#software") },
      },
      breadcrumbLd([
        { name: site.name, url: site.url },
        { name: "Product", url: absUrl("/features") },
        { name: f.name, url: absUrl(`/features/${f.slug}`) },
      ]),
      faqLd(f.faqs),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <PageHero eyebrow={f.name} title={f.h1} highlight={f.highlight} lead={f.lead}>
        <Link href="/signup" className="m-btn m-btn-ink">Start for free</Link>
        <Link href="/docs" className="m-btn m-btn-light">Read the docs</Link>
      </PageHero>

      <section className="m-container pb-20">
        <div className={f.code ? "grid gap-12 lg:grid-cols-[1.1fr_1fr]" : ""}>
          <div className={`grid min-w-0 gap-x-10 gap-y-9 ${f.code ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {f.points.map((p, i) => (
              <div key={p.title} data-reveal className="border-t pt-5" style={{ borderColor: "var(--m-line)", "--d": `${(i % 2) * 90}ms` } as React.CSSProperties}>
                <h2 className="text-[17px] font-semibold" style={{ color: "var(--m-head)" }}>{p.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{p.body}</p>
              </div>
            ))}
          </div>
          {f.code && (
            <div data-reveal="zoom" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <CodeBlock label={f.code.label} code={f.code.code} />
            </div>
          )}
        </div>
      </section>

      <div style={{ background: "var(--m-linen)" }}>
        <Faq items={f.faqs} />
      </div>

      {related.length > 0 && (
        <section className="m-container py-20">
          <h2 className="m-h2 text-[32px]">Works well with</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {related.map((r) => (
              <Link key={r!.slug} href={`/features/${r!.slug}`} data-reveal className="m-card m-card-hover m-spot block">
                <p className="font-semibold" style={{ color: "var(--m-head)" }}>{r!.name}</p>
                <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{r!.lead}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <CtaBand />
    </>
  );
}
