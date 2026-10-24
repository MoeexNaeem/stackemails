import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { CHANGELOG } from "@/content/changelog";
import { PageHero } from "@/components/marketing/Sections";
import { formatDate } from "@/lib/blog";

export const metadata: Metadata = pageMeta({
  title: "Changelog",
  description: "New features, improvements and fixes in Stack Emails.",
  path: "/changelog",
});

const TAG: Record<string, string> = { New: "var(--m-highlight)", Improved: "color-mix(in srgb, var(--m-lime) 45%, transparent)", Fixed: "color-mix(in srgb, var(--m-amber) 45%, transparent)" };

export default function ChangelogPage() {
  return (
    <>
      <PageHero eyebrow="Changelog" title="What's" highlight="new." lead="Every improvement to Stack Emails, as it ships." />
      <section className="m-container pb-24">
        <ol className="max-w-[860px]">
          {CHANGELOG.map((e) => (
            <li key={e.date + e.title} className="grid gap-4 border-t py-10 sm:grid-cols-[180px_1fr]" style={{ borderColor: "var(--m-line)" }}>
              <time dateTime={e.date} className="text-[14px]" style={{ color: "var(--m-faint)" }}>{formatDate(new Date(e.date))}</time>
              <div>
                <span className="rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: TAG[e.tag], color: "var(--m-head)" }}>{e.tag}</span>
                <h2 className="m-h3 mt-3 text-[24px]">{e.title}</h2>
                <ul className="mt-4 space-y-2.5 text-[15.5px] leading-relaxed" style={{ color: "var(--m-text)" }}>
                  {e.items.map((i) => <li key={i} className="flex gap-3"><span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--m-faint)" }} />{i}</li>)}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
