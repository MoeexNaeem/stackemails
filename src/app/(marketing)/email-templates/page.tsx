import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { PseoHub } from "@/components/marketing/Pseo";
import { TEMPLATES } from "@/content/pseo/templates";

export const metadata: Metadata = pageMeta({
  title: "Free transactional email templates (HTML): password reset, invoice, receipts",
  description: "Free, responsive HTML email templates for password resets, verification, magic links, OTP codes, order confirmations, invoices, receipts and more.",
  path: "/email-templates",
});

export default function TemplatesHub() {
  return (
    <PseoHub
      crumbs={[{ name: "Email templates", path: "/email-templates" }]}
      eyebrow="Free templates"
      title="Free transactional email templates"
      lead="Copy-ready subject lines, copy and responsive HTML for the emails every product sends. Tested layouts that render in Gmail, Outlook and Apple Mail."
      path="/email-templates"
      description="Free transactional email templates."
      groups={[{ items: TEMPLATES.map((t) => ({ href: `/email-templates/${t.slug}`, title: `${t.name} email template`, text: t.description.replace(/^A free /, "").replace(/^./, (c) => c.toUpperCase()), badge: "HTML" })) }]}
      intro={`## How to use these templates

Each template includes three subject lines, a preheader, plain-text copy and HTML built with tables and inline styles, so it renders in Outlook desktop as well as Gmail and Apple Mail. Replace the \`{{variables}}\` with your own data and send it with the [Stack Emails API](/docs/emails) or any SMTP library.

Prefer React? [React Email](/blog/send-email-nextjs) components work with Stack Emails too.`}
    />
  );
}
