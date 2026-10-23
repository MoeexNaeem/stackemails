import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { DOCS, DOC_GROUPS } from "@/content/docs";
import { CodeShowcase } from "@/components/marketing/CodeShowcase";
import { absUrl, jsonLd } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Documentation — Stack Emails API reference",
  description: "Stack Emails API documentation: quickstart, authentication, sending emails, domains, contacts, broadcasts, webhooks, inbound email, SMTP, MCP and the Node.js SDK.",
  path: "/docs",
});

const ENDPOINTS = [
  ["POST", "/v1/emails", "Send an email", "emails"],
  ["POST", "/v1/emails/batch", "Send up to 100 emails", "emails"],
  ["GET", "/v1/emails/:id", "Retrieve an email", "emails"],
  ["PATCH", "/v1/emails/:id", "Reschedule an email", "emails"],
  ["POST", "/v1/emails/:id/cancel", "Cancel a scheduled email", "emails"],
  ["POST", "/v1/domains", "Add a domain", "domains"],
  ["POST", "/v1/domains/:id/verify", "Verify a domain", "domains"],
  ["POST", "/v1/contacts", "Create or update a contact", "contacts"],
  ["POST", "/v1/segments", "Create a segment", "segments-topics"],
  ["POST", "/v1/topics", "Create a topic", "segments-topics"],
  ["POST", "/v1/broadcasts", "Create a broadcast", "broadcasts"],
  ["POST", "/v1/events", "Send a custom event", "events"],
];

export default function DocsIndex() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Stack Emails API documentation",
    url: absUrl("/docs"),
    publisher: { "@id": absUrl("/#organization") },
    hasPart: DOCS.map((d) => ({ "@type": "TechArticle", headline: d.title, url: absUrl(`/docs/${d.slug}`) })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <p className="m-eyebrow">Documentation</p>
      <h1 className="m-display mt-4 text-[40px] leading-[1.05] sm:text-[56px]">Build with Stack Emails</h1>
      <p className="m-lead mt-5 max-w-[620px]">Everything you need to send, receive and track email from your application. The API is REST-based, uses JSON and authenticates with bearer API keys.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/docs/quickstart" className="m-btn m-btn-ink">Quickstart</Link>
        <Link href="/docs/sdk" className="m-btn m-btn-light">Node.js SDK</Link>
      </div>

      <div className="mt-12"><CodeShowcase /></div>

      <div className="mt-14 grid gap-10 sm:grid-cols-2">
        {DOC_GROUPS.map((g) => (
          <div key={g}>
            <h2 className="text-[17px] font-semibold" style={{ color: "var(--m-head)" }}>{g}</h2>
            <ul className="mt-3 space-y-3">
              {DOCS.filter((d) => d.group === g).map((d) => (
                <li key={d.slug}>
                  <Link href={`/docs/${d.slug}`} className="group block">
                    <span className="font-medium group-hover:text-[var(--m-accent)]" style={{ color: "var(--m-ink)" }}>{d.title}</span>
                    <span className="block text-[14px]" style={{ color: "var(--m-muted)" }}>{d.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2 className="m-h2 mt-16 text-[28px]">Endpoints at a glance</h2>
      <p className="mt-2 text-[15px]" style={{ color: "var(--m-muted)" }}>Base URL <code className="rounded-md px-1.5 py-0.5 text-[13px]" style={{ background: "var(--m-linen)", fontFamily: "var(--font-mono)" }}>https://stackemails.com/v1</code></p>
      <div className="mt-6 overflow-x-auto rounded-[22px] border" style={{ borderColor: "var(--m-line)" }}>
        <table className="w-full min-w-[520px] text-left text-[14.5px]">
          <tbody>
            {ENDPOINTS.map(([m, path, desc, slug]) => (
              <tr key={m + path} className="border-b last:border-0" style={{ borderColor: "var(--m-line)" }}>
                <td className="px-4 py-3"><span className="rounded-md px-2 py-0.5 text-[12px] font-semibold" style={{ fontFamily: "var(--font-mono)", background: m === "GET" ? "#e0f2fe" : m === "PATCH" ? "#fef3c7" : "#ede9fe", color: "#1e293b" }}>{m}</span></td>
                <td className="px-4 py-3" style={{ fontFamily: "var(--font-mono)", color: "var(--m-head)" }}><Link href={`/docs/${slug}`} className="hover:underline">{path}</Link></td>
                <td className="px-4 py-3" style={{ color: "var(--m-muted)" }}>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
