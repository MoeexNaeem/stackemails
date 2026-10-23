import { DOCS, DOC_GROUPS } from "@/content/docs";
import { DocsNav } from "@/components/marketing/DocsNav";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-container grid gap-10 pt-28 pb-20 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
        <DocsNav items={DOCS.map(({ slug, title, group }) => ({ slug, title, group }))} groups={DOC_GROUPS} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
