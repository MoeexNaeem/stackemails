import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { PseoArticle } from "@/components/marketing/Pseo";
import { GUIDES, guideBySlug } from "@/content/pseo/guides";

export const dynamicParams = false;
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  return pageMeta({
    title: `How to send email with ${g.name} (API and SMTP examples)`,
    description: g.summary.slice(0, 160),
    path: `/send-email/${g.slug}`,
    type: "article",
  });
}

export default async function GuidePage({ params }: Props) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const related = g.related.map(guideBySlug).filter(Boolean) as typeof GUIDES;
  const steps = [
    { name: "Create an API key", text: "Sign up for Stack Emails and create an API key in the dashboard." },
    { name: "Verify your sending domain", text: "Add your domain and publish the SPF and DKIM DNS records shown." },
    { name: `Send the email from ${g.name}`, text: `Call POST https://stackemails.com/v1/emails from ${g.name} with your key, or use the SMTP relay.` },
  ];
  return (
    <PseoArticle
      crumbs={[{ name: "Send email guides", path: "/send-email" }, { name: g.name, path: `/send-email/${g.slug}` }]}
      eyebrow={`Guide · ${g.group}`}
      title={`How to send email with ${g.name}`}
      lead={g.summary}
      path={`/send-email/${g.slug}`}
      description={g.summary}
      updated="2026-11-05"
      markdown={`## 1. Set up\n\nYou need a Stack Emails API key ([create one free](/signup)) and a verified sending domain.\n\n${g.setup}\n\n## 2. Send your first email\n\n\`\`\`${g.lang}\n${g.api}\n\`\`\`\n\nA successful request returns \`202\` with the message id, for example \`{ "id": "msg_5b1f0c6c2a8e4e0f", "status": "queued" }\`. Errors return a JSON body with \`error.code\` and \`error.message\` (see [errors](/docs/errors)).${g.smtp ? `\n\n## 3. Or send over SMTP with ${g.smtp.lib}\n\n\`\`\`${g.lang}\n${g.smtp.code}\n\`\`\`` : ""}${g.extra ? `\n\n${g.extra}` : ""}\n\n## Production checklist\n\n- Keep the API key in an environment variable or secret manager, never in client-side code.\n- Add an \`Idempotency-Key\` header to retries so a timeout never sends twice ([idempotency](/docs/idempotency)).\n- Subscribe to [webhooks](/docs/webhooks) for bounces and complaints.\n- Check your domain's [SPF](/tools/spf-checker), [DKIM](/tools/dkim-checker) and [DMARC](/tools/dmarc-checker) records.\n- Start from a tested [email template](/email-templates) for password resets, receipts and invites.`}
      extraLd={[{ "@type": "HowTo", name: `How to send email with ${g.name}`, step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })) }]}
      related={[
        { title: "Guides for other languages", links: related.map((r) => ({ href: `/send-email/${r.slug}`, label: `Send email with ${r.name}` })) },
        { title: "Reference", links: [
          { href: "/docs/emails", label: "Emails API reference" },
          { href: "/docs/smtp", label: "SMTP relay settings" },
          { href: "/smtp-settings", label: "SMTP settings for other providers" },
          { href: "/blog/email-deliverability-guide", label: "Email deliverability guide" },
        ] },
      ]}
      faq={g.faq}
    >
      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className="m-btn m-btn-ink">Get a free API key</Link>
        <Link href="/docs/quickstart" className="m-btn m-btn-light">Quickstart</Link>
      </div>
    </PseoArticle>
  );
}
