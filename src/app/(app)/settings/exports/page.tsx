import type { Metadata } from "next";

export const metadata: Metadata = { title: "Exports" };

const EXPORTS = [
  { title: "Emails", desc: "Every email sent in the last 90 days with status, source and engagement.", href: "/api/dashboard/emails/export?range=90d" },
  { title: "Contacts", desc: "All contacts with names, subscription status, segments and properties.", href: "/api/dashboard/contacts/export" },
  { title: "Suppressions", desc: "Addresses that bounced, complained or were suppressed manually.", href: "/api/dashboard/suppressions/export" },
  { title: "API logs", desc: "API, SMTP and MCP requests from the last 30 days.", href: "/api/dashboard/logs/export" },
];

export default function ExportsPage() {
  return (
    <div>
      <p className="mb-5 text-sm text-fg-muted">CSV exports open in Excel, Google Sheets and Numbers. Exports reflect your team&apos;s data at the moment you download them.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {EXPORTS.map((e) => (
          <div key={e.title} className="card flex flex-col p-6">
            <p className="font-medium">{e.title}</p>
            <p className="mt-1 flex-1 text-sm text-fg-muted">{e.desc}</p>
            <a href={e.href} className="btn btn-secondary mt-4 w-fit">Download CSV</a>
          </div>
        ))}
      </div>
    </div>
  );
}
