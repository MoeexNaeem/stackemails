import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DOCS, docBySlug } from "@/content/docs";
import { renderMarkdown } from "@/lib/markdown";
import { absUrl, jsonLd } from "@/lib/site";
import { breadcrumbLd } from "@/components/marketing/Sections";
import { Icon } from "@/components/ui/Icon";

export const dynamicParams = false;

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = docBySlug((await params).slug);
  if (!d) return {};
  return pageMeta({ title: `${d.title} | API docs`, description: d.description, path: `/docs/${d.slug}` });
}

export default async function DocPage({ params }: Props) {
  const d = docBySlug((await params).slug);
  if (!d) notFound();
  const { html, toc } = renderMarkdown(d.content);
  const i = DOCS.indexOf(d);
  const prev = DOCS[i - 1];
  const next = DOCS[i + 1];

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "TechArticle", headline: d.title, description: d.description, url: absUrl(`/docs/${d.slug}`), publisher: { "@id": absUrl("/#organization") }, inLanguage: "en-US" },
      breadcrumbLd([
        { name: "Docs", url: absUrl("/docs") },
        { name: d.group, url: absUrl("/docs") },
        { name: d.title, url: absUrl(`/docs/${d.slug}`) },
      ]),
    ],
  };

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_200px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <article className="min-w-0 max-w-[760px]">
        <p className="text-[13px]" style={{ color: "var(--m-faint)" }}>{d.group}</p>
        <h1 className="m-display mt-2 text-[36px] leading-[1.08] sm:text-[44px]">{d.title}</h1>
        <p className="m-lead mt-4">{d.description}</p>
        <div className="m-prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />

        <div className="mt-16 grid gap-4 border-t pt-8 sm:grid-cols-2" style={{ borderColor: "var(--m-line)" }}>
          {prev ? (
            <Link href={`/docs/${prev.slug}`} className="m-card m-card-hover block !p-5">
              <span className="text-[12.5px]" style={{ color: "var(--m-faint)" }}><Icon name="arrow-left" size={14} className="mr-1" />Previous</span>
              <span className="mt-1 block font-semibold" style={{ color: "var(--m-head)" }}>{prev.title}</span>
            </Link>
          ) : <span />}
          {next && (
            <Link href={`/docs/${next.slug}`} className="m-card m-card-hover block !p-5 text-right">
              <span className="text-[12.5px]" style={{ color: "var(--m-faint)" }}>Next <Icon name="arrow-right" size={14} /></span>
              <span className="mt-1 block font-semibold" style={{ color: "var(--m-head)" }}>{next.title}</span>
            </Link>
          )}
        </div>
      </article>

      {toc.length > 1 && (
        <aside className="hidden xl:block">
          <nav aria-label="On this page" className="sticky top-24">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--m-faint)" }}>On this page</p>
            <ul className="mt-3 space-y-2 border-l text-[13px]" style={{ borderColor: "var(--m-line)" }}>
              {toc.map((t) => (
                <li key={t.id} style={{ paddingLeft: t.depth === 3 ? 22 : 12 }}>
                  <a href={`#${t.id}`} className="block leading-snug hover:text-[var(--m-head)]" style={{ color: "var(--m-muted)" }}>{t.text}</a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  );
}
