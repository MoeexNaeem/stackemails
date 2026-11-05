import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { PseoArticle } from "@/components/marketing/Pseo";
import { ALTERNATIVES, VENDORS, altBySlug } from "@/content/pseo/alternatives";
import { absUrl } from "@/lib/site";

export const dynamicParams = false;
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return ALTERNATIVES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = altBySlug((await params).slug);
  if (!a) return {};
  const v = VENDORS[a.vendor];
  return pageMeta({ title: `Best ${v.name} alternatives in 2026 (free and paid)`, description: a.lead.slice(0, 160), path: `/alternatives/${a.slug}`, type: "article" });
}

export default async function AlternativePage({ params }: Props) {
  const a = altBySlug((await params).slug);
  if (!a) notFound();
  const v = VENDORS[a.vendor];
  const picks = a.picks.map((k) => VENDORS[k]);
  const others = ALTERNATIVES.filter((x) => x.slug !== a.slug);

  const list = picks
    .map((p, i) => `### ${i + 1}. ${p.name}${i === 0 ? " (our product)" : ""}\n\n${p.blurb}\n\n**Best for:** ${p.bestFor}${p.compare ? ` [Compare with Stack Emails](${p.compare}).` : ""}`)
    .join("\n\n");

  return (
    <PseoArticle
      crumbs={[{ name: "Alternatives", path: "/alternatives" }, { name: `${v.name} alternatives`, path: `/alternatives/${a.slug}` }]}
      eyebrow="Alternatives"
      title={`The best ${v.name} alternatives`}
      lead={a.lead}
      path={`/alternatives/${a.slug}`}
      description={a.lead}
      updated="2026-11-05"
      markdown={`## Why teams look for a ${v.name} alternative\n\n${v.name} is a capable product: ${v.blurb.charAt(0).toLowerCase()}${v.blurb.slice(1)} Teams we talk to usually start comparing for one of these reasons:\n\n${a.reasons.map((r) => `- ${r}`).join("\n")}\n\n## ${v.name} alternatives at a glance\n\n${list}\n\n## How to switch from ${v.name}\n\n${a.switching}\n\n1. [Create a free Stack Emails account](/signup) and verify your sending domain (check it with our [SPF](/tools/spf-checker) and [DKIM](/tools/dkim-checker) checkers).\n2. Create a sending-only API key.\n3. Send a share of traffic through Stack Emails, compare delivery, then switch fully.\n4. Move webhooks and update your [DMARC record](/tools/dmarc-checker) if your new provider sends from a different return path.\n\n*We built Stack Emails, so weigh our view accordingly. Details about other providers come from their public documentation as of November 2026; check their websites for current features and pricing.*`}
      extraLd={[{ "@type": "ItemList", name: `${v.name} alternatives`, itemListElement: picks.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, ...(p.slug === "stack-emails" ? { url: absUrl("/") } : {}) })) }]}
      related={[
        { title: "Other alternatives", links: others.map((o) => ({ href: `/alternatives/${o.slug}`, label: `${VENDORS[o.vendor].name} alternatives` })) },
        { title: "Compare and migrate", links: [
          ...(v.compare ? [{ href: v.compare, label: `Stack Emails vs ${v.name}: feature table` }] : []),
          { href: `/smtp-settings/${v.slug === "mandrill" ? "stack-emails" : v.slug}`, label: `${v.slug === "mandrill" ? "Stack Emails" : v.name} SMTP settings` },
          { href: "/pricing", label: "Stack Emails pricing" },
          { href: "/docs/quickstart", label: "Quickstart: send your first email" },
        ] },
      ]}
      faq={a.faq}
    >
      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className="m-btn m-btn-ink">Try Stack Emails free</Link>
        {v.compare && <Link href={v.compare} className="m-btn m-btn-light">Stack Emails vs {v.name}</Link>}
      </div>
    </PseoArticle>
  );
}
