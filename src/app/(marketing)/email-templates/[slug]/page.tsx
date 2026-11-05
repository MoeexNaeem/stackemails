import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { PseoArticle } from "@/components/marketing/Pseo";
import { CodeBlock } from "@/components/marketing/Sections";
import { TEMPLATES, templateBySlug, templateHtml, templateText } from "@/content/pseo/templates";

export const dynamicParams = false;
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = templateBySlug((await params).slug);
  if (!t) return {};
  return pageMeta({ title: `${t.name} email template: free HTML, subject lines and copy`, description: t.description, path: `/email-templates/${t.slug}`, type: "article" });
}

export default async function TemplatePage({ params }: Props) {
  const t = templateBySlug((await params).slug);
  if (!t) notFound();
  const html = templateHtml(t);
  const text = templateText(t);
  const related = t.related.map(templateBySlug).filter(Boolean) as typeof TEMPLATES;
  const send = `curl -X POST https://stackemails.com/v1/emails \
  -H "Authorization: Bearer $STACKEMAILS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Acme <hello@mail.acme.com>",
    "to": "ada@example.com",
    "subject": "${t.subjects[0].replace(/'/g, "")}",
    "html": "<!-- the HTML above, with variables filled in -->",
    "text": "<!-- the plain-text version -->",
    "tags": [{ "name": "template", "value": "${t.slug}" }]
  }'`;
  return (
    <PseoArticle
      crumbs={[{ name: "Email templates", path: "/email-templates" }, { name: t.name, path: `/email-templates/${t.slug}` }]}
      eyebrow="Free email template"
      title={`${t.name} email template`}
      lead={`${t.description.replace(/^A free /, "A ready-to-use ").replace(/\.$/, "")}. Copy it, swap in your brand and variables, and send.`}
      path={`/email-templates/${t.slug}`}
      description={t.description}
      updated="2026-11-05"
      markdown={`## Subject line ideas\n\n${t.subjects.map((s) => `- ${s}`).join("\n")}\n\n**Preheader:** ${t.preheader}\n\n## Best practices\n\n${t.tips.map((s) => `- ${s}`).join("\n")}\n\n## Variables used\n\n${t.variables.map((v) => `\`${v}\``).join(", ")}\n\n## Plain-text version\n\nAlways send a text part alongside HTML. It helps deliverability and accessibility.\n\n\`\`\`text\n${text}\n\`\`\``}
      related={[
        { title: "More email templates", links: related.map((r) => ({ href: `/email-templates/${r.slug}`, label: `${r.name} email template` })) },
        { title: "Send it", links: [
          { href: "/send-email/nodejs", label: "Send email with Node.js" },
          { href: "/send-email/python", label: "Send email with Python" },
          { href: "/send-email/php", label: "Send email with PHP" },
          { href: "/glossary/transactional-email", label: "What is transactional email?" },
        ] },
      ]}
      after={
        <div className="grid gap-6">
          <h2 className="m-h2 text-[26px]">Send it with the API</h2>
          <CodeBlock label="POST /v1/emails" code={send} />
        </div>
      }
    >
      <div className="grid gap-6">
        <div className="overflow-hidden rounded-[22px] border" style={{ borderColor: "var(--m-line)" }}>
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-[12.5px]" style={{ borderColor: "var(--m-line)", background: "var(--m-linen)", color: "var(--m-muted)" }}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#f87171" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#fbbf24" }} />
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#34d399" }} />
            <span className="ml-2 truncate"><strong style={{ color: "var(--m-head)" }}>{t.subjects[0]}</strong> · {t.preheader}</span>
          </div>
          <iframe title={`${t.name} email preview`} srcDoc={html} sandbox="" loading="lazy" className="block h-[560px] w-full" style={{ background: "#f4f4f5" }} />
        </div>
        <CodeBlock label={`${t.slug}.html`} code={html} />
      </div>
    </PseoArticle>
  );
}
