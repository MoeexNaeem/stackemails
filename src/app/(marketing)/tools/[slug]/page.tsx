import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { PseoArticle } from "@/components/marketing/Pseo";
import { DmarcGenerator, DnsChecker, SpfGenerator } from "@/components/marketing/DnsTools";
import { TOOLS, toolBySlug } from "@/content/pseo/tools";
import { termBySlug } from "@/content/pseo/glossary";
import { absUrl, site } from "@/lib/site";

export const dynamicParams = false;
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = toolBySlug((await params).slug);
  if (!t) return {};
  return pageMeta({ title: t.metaTitle, description: t.description, path: `/tools/${t.slug}` });
}

export default async function ToolPage({ params }: Props) {
  const t = toolBySlug((await params).slug);
  if (!t) notFound();
  const widget =
    t.widget === "spf-generator" ? <SpfGenerator /> : t.widget === "dmarc-generator" ? <DmarcGenerator /> : <DnsChecker kind={t.widget} />;
  return (
    <PseoArticle
      crumbs={[{ name: "Free tools", path: "/tools" }, { name: t.name, path: `/tools/${t.slug}` }]}
      eyebrow="Free tool"
      title={t.name}
      lead={t.lead}
      path={`/tools/${t.slug}`}
      description={t.description}
      markdown={t.body}
      schemaType="WebApplication"
      extraLd={[{ "@type": "WebApplication", name: `${t.name} by ${site.name}`, url: absUrl(`/tools/${t.slug}`), applicationCategory: "DeveloperApplication", operatingSystem: "Any", isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, description: t.description }]}
      related={[
        { title: "More free tools", links: t.related.map((s) => toolBySlug(s)).filter(Boolean).map((r) => ({ href: `/tools/${r!.slug}`, label: r!.name })) },
        { title: "Learn the basics", links: t.glossary.map((g) => termBySlug(g)).filter(Boolean).map((g) => ({ href: `/glossary/${g!.slug}`, label: `What is ${g!.short ?? g!.term}?` })) },
      ]}
      faq={t.faq}
    >
      {widget}
    </PseoArticle>
  );
}
