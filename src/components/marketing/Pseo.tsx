import Link from "next/link";
import { renderMarkdown } from "@/lib/markdown";
import { CtaBand, Faq, breadcrumbLd, faqLd } from "@/components/marketing/Sections";
import { absUrl, jsonLd, site } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";

/**
 * Shared shell for programmatic SEO pages (SMTP settings, guides, templates,
 * alternatives, glossary, tools): breadcrumbs, H1 + lead, Markdown body with
 * an "On this page" TOC, related links for internal linking, FAQ, CTA and
 * JSON-LD (WebPage/TechArticle + BreadcrumbList + FAQPage).
 */
export type Crumb = { name: string; path: string };
export type RelatedLink = { href: string; label: string; note?: string };

export function PseoArticle(props: {
  crumbs: Crumb[];
  eyebrow: string;
  title: string;
  lead: string;
  path: string;
  description: string;
  updated?: string;
  markdown?: string;
  /** Rendered between the lead and the Markdown body (tables, tools, previews). */
  children?: React.ReactNode;
  /** Rendered after the Markdown body. */
  after?: React.ReactNode;
  related?: { title: string; links: RelatedLink[] }[];
  faq?: { q: string; a: string }[];
  schemaType?: "TechArticle" | "Article" | "WebPage" | "DefinedTerm" | "WebApplication";
  extraLd?: Record<string, unknown>[];
  cta?: { title?: string; lead?: string };
}) {
  const { html, toc } = props.markdown ? renderMarkdown(props.markdown) : { html: "", toc: [] };
  const url = absUrl(props.path);
  const main: Record<string, unknown> =
    props.schemaType === "WebPage" || props.schemaType === "WebApplication" || props.schemaType === "DefinedTerm"
      ? { "@type": "WebPage", "@id": `${url}#page`, url, name: props.title, description: props.description, isPartOf: { "@id": absUrl("/#website") } }
      : {
          "@type": props.schemaType ?? "TechArticle",
          "@id": `${url}#article`,
          headline: props.title,
          description: props.description,
          url,
          mainEntityOfPage: url,
          ...(props.updated ? { dateModified: props.updated } : {}),
          author: { "@type": "Organization", name: site.name, url: site.url },
          publisher: { "@id": absUrl("/#organization") },
          isPartOf: { "@id": absUrl("/#website") },
        };
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      main,
      breadcrumbLd([{ name: site.name, url: site.url }, ...props.crumbs.map((c) => ({ name: c.name, url: absUrl(c.path) }))]),
      ...(props.faq?.length ? [faqLd(props.faq)] : []),
      ...(props.extraLd ?? []),
    ],
  };
  const sections = toc.filter((t) => t.depth === 2);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <div className="m-container grid gap-12 pt-28 pb-12 sm:pt-32 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article className="min-w-0 max-w-[780px]">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px]" style={{ color: "var(--m-faint)" }}>
            <Link href="/" className="hover:text-[var(--m-head)]">Home</Link>
            {props.crumbs.map((c, i) => (
              <span key={c.path} className="flex items-center gap-1.5">
                <Icon name="chevron-right" size={12} />
                {i === props.crumbs.length - 1 ? <span aria-current="page" style={{ color: "var(--m-muted)" }}>{c.name}</span> : <Link href={c.path} className="hover:text-[var(--m-head)]">{c.name}</Link>}
              </span>
            ))}
          </nav>
          <p className="m-eyebrow mt-6">{props.eyebrow}</p>
          <h1 className="m-display mt-4 text-[36px] leading-[1.06] sm:text-[52px]">{props.title}</h1>
          <p className="m-lead mt-5">{props.lead}</p>
          {props.updated && <p className="mt-4 text-[13px]" style={{ color: "var(--m-faint)" }}>Last reviewed {new Date(props.updated).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>}
          {props.children && <div className="mt-8">{props.children}</div>}
          {html && <div className="m-prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />}
          {props.after && <div className="mt-10">{props.after}</div>}
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-8">
            {sections.length > 2 && (
              <nav aria-label="On this page">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--m-faint)" }}>On this page</p>
                <ul className="mt-3 space-y-2 border-l text-[13px]" style={{ borderColor: "var(--m-line)" }}>
                  {sections.map((t) => (
                    <li key={t.id} className="pl-3"><a href={`#${t.id}`} className="block leading-snug hover:text-[var(--m-head)]" style={{ color: "var(--m-muted)" }}>{t.text}</a></li>
                  ))}
                </ul>
              </nav>
            )}
            <div className="rounded-[18px] border p-5" style={{ borderColor: "var(--m-line)", background: "var(--m-linen)" }}>
              <p className="text-[14px] font-semibold" style={{ color: "var(--m-head)" }}>Send email from your app</p>
              <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--m-muted)" }}>REST API, SMTP relay and webhooks. 3,000 emails a month free.</p>
              <Link href="/signup" className="m-btn m-btn-ink m-btn-sm mt-4 w-full justify-center">Start free</Link>
            </div>
          </div>
        </aside>
      </div>

      {props.related?.some((r) => r.links.length) && (
        <section className="m-container pb-8">
          <div className="grid gap-5 md:grid-cols-2">
            {props.related.filter((r) => r.links.length).map((r) => (
              <div key={r.title} className="m-card">
                <h2 className="text-[16px] font-semibold" style={{ color: "var(--m-head)" }}>{r.title}</h2>
                <ul className="mt-4 grid gap-2.5">
                  {r.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="group flex items-start gap-2 text-[14.5px] hover:text-[var(--m-head)]" style={{ color: "var(--m-text)" }}>
                        <Icon name="arrow-right" size={14} className="mt-[4px] shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "var(--m-accent)" }} />
                        <span>{l.label}{l.note && <span className="block text-[12.5px]" style={{ color: "var(--m-faint)" }}>{l.note}</span>}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {props.faq && <Faq items={props.faq} />}
      <CtaBand {...props.cta} />
    </>
  );
}

/** Index page listing a programmatic section's entries as cards. */
export function PseoHub(props: {
  crumbs: Crumb[];
  eyebrow: string;
  title: string;
  lead: string;
  path: string;
  description: string;
  groups: { title?: string; items: { href: string; title: string; text: string; badge?: string }[] }[];
  intro?: string;
  faq?: { q: string; a: string }[];
}) {
  const url = absUrl(props.path);
  const all = props.groups.flatMap((g) => g.items);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${url}#page`, url, name: props.title, description: props.description, isPartOf: { "@id": absUrl("/#website") } },
      { "@type": "ItemList", itemListElement: all.map((it, i) => ({ "@type": "ListItem", position: i + 1, url: absUrl(it.href), name: it.title })) },
      breadcrumbLd([{ name: site.name, url: site.url }, ...props.crumbs.map((c) => ({ name: c.name, url: absUrl(c.path) }))]),
      ...(props.faq?.length ? [faqLd(props.faq)] : []),
    ],
  };
  const { html } = props.intro ? renderMarkdown(props.intro) : { html: "" };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <section className="m-container pt-28 pb-10 sm:pt-32">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px]" style={{ color: "var(--m-faint)" }}>
          <Link href="/" className="hover:text-[var(--m-head)]">Home</Link>
          {props.crumbs.map((c) => (
            <span key={c.path} className="flex items-center gap-1.5"><Icon name="chevron-right" size={12} /><span style={{ color: "var(--m-muted)" }}>{c.name}</span></span>
          ))}
        </nav>
        <p className="m-eyebrow mt-6">{props.eyebrow}</p>
        <h1 className="m-display mt-4 max-w-[20ch] text-[38px] leading-[1.05] sm:text-[56px]">{props.title}</h1>
        <p className="m-lead mt-5 max-w-[680px]">{props.lead}</p>
      </section>
      {props.groups.map((g, gi) => (
        <section key={g.title ?? gi} className="m-container pb-12">
          {g.title && <h2 className="m-h2 mb-6 text-[26px]">{g.title}</h2>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((it) => (
              <Link key={it.href} href={it.href} data-reveal className="m-card m-spot group flex min-w-0 flex-col">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-[16.5px] font-semibold leading-snug" style={{ color: "var(--m-head)" }}>{it.title}</span>
                  {it.badge && <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--m-linen)", color: "var(--m-muted)" }}>{it.badge}</span>}
                </span>
                <span className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{it.text}</span>
                <span className="mt-auto flex items-center gap-1.5 pt-4 text-[13px] font-medium" style={{ color: "var(--m-accent)" }}>Read <Icon name="arrow-right" size={13} className="transition-transform group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {html && <section className="m-container pb-8"><div className="m-prose max-w-[780px]" dangerouslySetInnerHTML={{ __html: html }} /></section>}
      {props.faq && <Faq items={props.faq} />}
      <CtaBand />
    </>
  );
}

/** Small key/value settings table used by SMTP pages. */
export function SettingsTable({ rows, caption }: { rows: [string, string][]; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-[20px] border" style={{ borderColor: "var(--m-line)" }}>
      <table className="w-full min-w-[420px] text-left text-[15px]">
        {caption && <caption className="px-5 pt-4 pb-1 text-left text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--m-faint)" }}>{caption}</caption>}
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-t first:border-t-0" style={{ borderColor: "var(--m-line)" }}>
              <th scope="row" className="w-[38%] px-5 py-3 font-medium" style={{ color: "var(--m-muted)" }}>{k}</th>
              <td className="px-5 py-3 font-mono text-[14px]" style={{ color: "var(--m-head)" }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
