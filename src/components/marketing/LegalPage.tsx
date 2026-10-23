import { renderMarkdown } from "@/lib/markdown";

/** Long-form text page (legal, security, about) rendered from Markdown with a TOC. */
export function LegalPage({ eyebrow, title, updated, intro, markdown }: { eyebrow: string; title: string; updated?: string; intro?: string; markdown: string }) {
  const { html, toc } = renderMarkdown(markdown);
  return (
    <div className="m-container grid gap-12 pt-32 pb-24 lg:grid-cols-[minmax(0,1fr)_220px]">
      <article className="min-w-0 max-w-[740px]">
        <p className="m-eyebrow">{eyebrow}</p>
        <h1 className="m-display mt-4 text-[40px] leading-[1.05] sm:text-[56px]">{title}</h1>
        {updated && <p className="mt-4 text-[14px]" style={{ color: "var(--m-faint)" }}>Last updated {updated}</p>}
        {intro && <p className="m-lead mt-6">{intro}</p>}
        <div className="m-prose mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
      {toc.length > 2 && (
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--m-faint)" }}>On this page</p>
            <ul className="mt-3 space-y-2 border-l text-[13px]" style={{ borderColor: "var(--m-line)" }}>
              {toc.filter((t) => t.depth === 2).map((t) => (
                <li key={t.id} className="pl-3"><a href={`#${t.id}`} className="block leading-snug hover:text-[var(--m-head)]" style={{ color: "var(--m-muted)" }}>{t.text}</a></li>
              ))}
            </ul>
          </nav>
        </aside>
      )}
    </div>
  );
}
