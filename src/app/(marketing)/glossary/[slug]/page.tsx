import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { PseoArticle } from "@/components/marketing/Pseo";
import { GLOSSARY, termBySlug } from "@/content/pseo/glossary";
import { absUrl } from "@/lib/site";

export const dynamicParams = false;
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GLOSSARY.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = termBySlug((await params).slug);
  if (!t) return {};
  const name = t.short ?? t.term;
  return pageMeta({ title: `What is ${name}? Definition and examples`, description: t.definition.slice(0, 160), path: `/glossary/${t.slug}`, type: "article" });
}

export default async function TermPage({ params }: Props) {
  const t = termBySlug((await params).slug);
  if (!t) notFound();
  const name = t.short ?? t.term;
  const related = t.related.map(termBySlug).filter(Boolean) as typeof GLOSSARY;
  return (
    <PseoArticle
      crumbs={[{ name: "Glossary", path: "/glossary" }, { name: t.term, path: `/glossary/${t.slug}` }]}
      eyebrow={`Glossary · ${t.category}`}
      title={`What is ${name}?`}
      lead={t.definition}
      path={`/glossary/${t.slug}`}
      description={t.definition}
      markdown={t.body}
      schemaType="Article"
      extraLd={[{ "@type": "DefinedTerm", name: t.term, description: t.definition, url: absUrl(`/glossary/${t.slug}`), inDefinedTermSet: { "@type": "DefinedTermSet", name: "Stack Emails email glossary", url: absUrl("/glossary") } }]}
      related={[
        { title: "Related terms", links: related.map((r) => ({ href: `/glossary/${r.slug}`, label: r.term })) },
        { title: "Tools and guides", links: [...(t.links ?? []), { href: "/glossary", label: "Browse the full email glossary" }] },
      ]}
    />
  );
}
