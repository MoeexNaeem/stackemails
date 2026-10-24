import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Documents" };

/**
 * Legal & security documents customers can review or share with their
 * procurement team. Only documents we can genuinely stand behind are listed.
 */
const DOCS = [
  { title: "Data Processing Agreement (DPA)", body: "Our standard DPA covering how we process personal data on your behalf (GDPR Art. 28). It's incorporated into the Terms when you sign up.", href: "/legal/dpa" },
  { title: "Subprocessors", body: "The third parties we use to deliver the service (Amazon Web Services SES, MongoDB Atlas, Upstash and Anthropic) and what each one processes.", href: "/legal/subprocessors" },
  { title: "Security overview", body: "How we protect your data: encryption in transit and at rest, hashed API keys, signed webhooks, tenant isolation, MFA and access controls.", href: "/security" },
  { title: "Terms of Service", body: "The agreement that governs your use of Stack Emails, including acceptable use and anti-spam rules.", href: "/terms" },
  { title: "Privacy Policy", body: "What we collect, why, how long we keep it and your rights.", href: "/privacy" },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-4">
      {DOCS.map((d) => (
        <div key={d.title} className="card flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="max-w-2xl">
            <h2 className="font-medium">{d.title}</h2>
            <p className="mt-1.5 text-sm text-fg-muted">{d.body}</p>
          </div>
          <Link href={d.href} target="_blank" className="btn btn-secondary">View <Icon name="arrow-up-right" size={14} /></Link>
        </div>
      ))}
      <p className="text-xs text-fg-subtle">Need a signed copy, a security questionnaire completed, or a custom DPA? <Link href="/help" className="text-accent hover:underline">Open a ticket</Link>.</p>
    </div>
  );
}
