import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PreferredSourceButton } from "@/components/marketing/PreferredSource";
import { site } from "@/lib/site";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features/transactional-email", label: "Transactional email" },
      { href: "/features/marketing-email", label: "Broadcasts" },
      { href: "/features/inbound-email", label: "Inbound & inboxes" },
      { href: "/features/smtp-relay", label: "SMTP relay" },
      { href: "/features/email-webhooks", label: "Webhooks" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Developers",
    links: [
      { href: "/docs", label: "API reference" },
      { href: "/docs/sdk", label: "Node.js SDK" },
      { href: "/features/mcp-server", label: "MCP server" },
      { href: "/changelog", label: "Changelog" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/blog/email-deliverability-guide", label: "Deliverability guide" },
      { href: "/blog/spf-dkim-dmarc-setup-guide", label: "SPF, DKIM & DMARC" },
      { href: "/compare/resend", label: "vs Resend" },
      { href: "/compare/sendgrid", label: "vs SendGrid" },
      { href: "/compare/amazon-ses", label: "vs Amazon SES" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/security", label: "Security" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/legal/dpa", label: "DPA" },
    ],
  },
];

export function Footer() {
  return (
    <footer style={{ background: "var(--m-linen)" }}>
      <div className="m-container py-16">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div className="space-y-5">
            <Logo tone="ink" />
            <p className="m-body max-w-sm" style={{ color: "var(--m-muted)" }}>{site.description}</p>
            <PreferredSourceButton />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <p className="text-sm font-semibold" style={{ color: "var(--m-head)" }}>{c.title}</p>
                <ul className="mt-4 space-y-3">
                  {c.links.map((l) => (
                    <li key={l.href}><Link href={l.href} className="text-sm transition-colors hover:text-[var(--m-head)]" style={{ color: "var(--m-muted)" }}>{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm" style={{ borderColor: "var(--m-line)", color: "var(--m-muted)" }}>
          <p>© {new Date().getFullYear()} Stack Emails. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/status" className="flex items-center gap-2 hover:text-[var(--m-head)]"><span className="h-2 w-2 rounded-full" style={{ background: "var(--m-accent)" }} />System status</Link>
            <a href={site.social.x} rel="noopener me" target="_blank" aria-label="Stack Emails on X" className="hover:text-[var(--m-head)]">X</a>
            <a href={site.social.github} rel="noopener me" target="_blank" aria-label="Stack Emails on GitHub" className="hover:text-[var(--m-head)]">GitHub</a>
            <a href={site.social.linkedin} rel="noopener me" target="_blank" aria-label="Stack Emails on LinkedIn" className="hover:text-[var(--m-head)]">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
