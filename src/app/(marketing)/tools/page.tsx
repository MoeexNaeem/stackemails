import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PseoHub } from "@/components/marketing/Pseo";
import { TOOLS } from "@/content/pseo/tools";

export const metadata: Metadata = pageMeta({
  title: "Free email tools: SPF, DKIM and DMARC checkers and generators",
  description: "Free email deliverability tools for developers: SPF checker and generator, DKIM checker, DMARC checker and generator, and MX lookup. No sign-up needed.",
  path: "/tools",
});

export default function ToolsHub() {
  return (
    <PseoHub
      crumbs={[{ name: "Free tools", path: "/tools" }]}
      eyebrow="Free tools"
      title="Free email authentication tools"
      lead="Check and create the DNS records that decide whether your email reaches the inbox. No sign-up, no limits for normal use."
      path="/tools"
      description="Free SPF, DKIM, DMARC and MX tools."
      groups={[
        { title: "Checkers", items: TOOLS.filter((t) => !t.widget.endsWith("generator")).map((t) => ({ href: `/tools/${t.slug}`, title: t.name, text: t.lead, badge: "Free" })) },
        { title: "Generators", items: TOOLS.filter((t) => t.widget.endsWith("generator")).map((t) => ({ href: `/tools/${t.slug}`, title: t.name, text: t.lead, badge: "Free" })) },
      ]}
      intro={`## Why these records matter

Since 2024, Gmail and Yahoo reject or spam-folder mail that isn't authenticated, and require SPF, DKIM and DMARC from bulk senders. Our [SPF, DKIM and DMARC setup guide](/blog/spf-dkim-dmarc-setup-guide) walks through all three.`}
    />
  );
}
