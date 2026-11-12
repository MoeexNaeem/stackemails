import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMeta } from "@/lib/seo";
import { PseoArticle, SettingsTable } from "@/components/marketing/Pseo";
import { SMTP_PROVIDERS, SMTP_REVIEWED, smtpBySlug } from "@/content/pseo/smtp";

export const dynamicParams = false;
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SMTP_PROVIDERS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = smtpBySlug((await params).slug);
  if (!p) return {};
  const port = p.ports.map((x) => x.port).slice(0, 2).join(" / ");
  return pageMeta({
    // Longest title that fits Google's ~60 characters, so the provider name and "SMTP" always show.
    title: [`${p.name} SMTP settings: server, port ${port} and login (2026)`, `${p.name} SMTP settings: server, port and login (2026)`, `${p.name} SMTP server settings (2026)`, `${p.name} SMTP settings`].find((t) => t.length <= 60) ?? `${p.name} SMTP settings`,
    description: `${p.name} SMTP server: ${p.host}, port ${port}. Username, password and ${p.imap ? "IMAP settings" : "setup steps"}, plus fixes for common sign-in errors.`.slice(0, 160),
    path: `/smtp-settings/${p.slug}`,
    type: "article",
  });
}

export default async function SmtpPage({ params }: Props) {
  const p = smtpBySlug((await params).slug);
  if (!p) notFound();

  const outgoing: [string, string][] = [
    ["SMTP server", p.host],
    ...p.ports.map((x): [string, string] => [x.recommended ? "Port (recommended)" : "Port", `${x.port} (${x.security})`]),
    ["Username", p.username],
    ["Password", p.password],
    ["Authentication", "Required"],
    ...(p.extra ?? []),
  ];
  const incoming: [string, string][] = [
    ...(p.imap ? ([["IMAP server", p.imap.host], ["IMAP port", `${p.imap.port} (SSL/TLS)`]] as [string, string][]) : []),
    ...(p.pop ? ([["POP3 server", p.pop.host], ["POP3 port", `${p.pop.port} (SSL/TLS)`]] as [string, string][]) : []),
  ];
  const others = p.related.map((s) => smtpBySlug(s)).filter(Boolean) as typeof SMTP_PROVIDERS;

  return (
    <PseoArticle
      crumbs={[{ name: "SMTP settings", path: "/smtp-settings" }, { name: p.name, path: `/smtp-settings/${p.slug}` }]}
      eyebrow={`${p.kind} · SMTP settings`}
      title={`${p.name} SMTP settings`}
      lead={p.lead}
      path={`/smtp-settings/${p.slug}`}
      description={p.lead}
      updated={SMTP_REVIEWED}
      markdown={`${p.limits ? `## Sending limits\n\n${p.limits}\n\n` : ""}${p.notes}\n\n## Check your domain's email records\n\nIf you send from your own domain, receiving servers check SPF, DKIM and DMARC. Use our free [SPF checker](/tools/spf-checker), [DKIM checker](/tools/dkim-checker) and [DMARC checker](/tools/dmarc-checker) to confirm they pass.\n\n*Settings checked against ${p.name}'s public help pages. Providers change authentication rules from time to time, so confirm in their documentation if something doesn't work.*`}
      related={[
        { title: "Other SMTP settings", links: others.map((o) => ({ href: `/smtp-settings/${o.slug}`, label: `${o.name} SMTP settings`, note: o.host })) },
        { title: "Related guides and tools", links: [
          { href: "/blog/smtp-ports-25-465-587-2525", label: "SMTP ports explained: 25, 465, 587 and 2525" },
          { href: "/glossary/smtp", label: "What is SMTP?" },
          { href: "/glossary/starttls", label: "What is STARTTLS?" },
          { href: "/tools/mx-lookup", label: "MX record lookup" },
          { href: "/send-email", label: "Send email from code: guides for 20+ languages" },
        ] },
      ]}
      faq={p.faq}
    >
      <div className="grid gap-5">
        <SettingsTable caption="Outgoing mail (SMTP)" rows={outgoing} />
        {incoming.length > 0 && <SettingsTable caption="Incoming mail" rows={incoming} />}
      </div>
    </PseoArticle>
  );
}
