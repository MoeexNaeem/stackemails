import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PseoHub } from "@/components/marketing/Pseo";
import { GLOSSARY } from "@/content/pseo/glossary";

export const metadata: Metadata = pageMeta({
  title: "Email glossary: SPF, DKIM, DMARC, SMTP and deliverability terms",
  description: "Plain-English definitions of email terms developers run into: SPF, DKIM, DMARC, SMTP relay, STARTTLS, bounces, suppression lists, IP warming and more.",
  path: "/glossary",
});

const CATS = ["Authentication", "Deliverability", "Infrastructure", "Sending"] as const;

export default function GlossaryHub() {
  return (
    <PseoHub
      crumbs={[{ name: "Glossary", path: "/glossary" }]}
      eyebrow="Glossary"
      title="The email glossary for developers"
      lead="Short, accurate definitions of the terms behind sending, authenticating and delivering email, with links to tools and guides that go deeper."
      path="/glossary"
      description="Email glossary for developers."
      groups={CATS.map((c) => ({
        title: c,
        items: GLOSSARY.filter((t) => t.category === c).map((t) => ({ href: `/glossary/${t.slug}`, title: t.term, text: t.definition.length > 120 ? `${t.definition.slice(0, 117).replace(/\s+\S*$/, "")}...` : t.definition })),
      }))}
    />
  );
}
