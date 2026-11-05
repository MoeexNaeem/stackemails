import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PseoHub } from "@/components/marketing/Pseo";
import { GUIDES } from "@/content/pseo/guides";

export const metadata: Metadata = pageMeta({
  title: "How to send email from code: Node.js, Python, PHP, Go and 20+ more",
  description: "Copy-paste guides for sending email from Node.js, Next.js, Python, Django, PHP, Laravel, Rails, Go, Java, C#, Rust and more, with API and SMTP examples.",
  path: "/send-email",
});

const GROUPS = [...new Set(GUIDES.map((g) => g.group))];

export default function SendEmailHub() {
  return (
    <PseoHub
      crumbs={[{ name: "Send email guides", path: "/send-email" }]}
      eyebrow="Guides"
      title="How to send email from your code"
      lead="Working examples for the languages and frameworks developers actually use, with the HTTP API and an SMTP alternative for each."
      path="/send-email"
      description="Send email guides for 20+ languages and frameworks."
      groups={GROUPS.map((g) => ({ title: g, items: GUIDES.filter((x) => x.group === g).map((x) => ({ href: `/send-email/${x.slug}`, title: `Send email with ${x.name}`, text: x.summary.length > 130 ? `${x.summary.slice(0, 127).replace(/\s+\S*$/, "")}...` : x.summary })) }))}
      intro={`## Before you start

1. [Create a free Stack Emails account](/signup) and an API key.
2. Verify a sending domain (we recommend a subdomain like \`mail.yourcompany.com\`).
3. Pick your language above. Every guide uses the same endpoint, \`POST https://stackemails.com/v1/emails\`, documented in the [API reference](/docs/emails).`}
    />
  );
}
