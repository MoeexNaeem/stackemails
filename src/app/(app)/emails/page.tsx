import type { Metadata } from "next";
import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, Domain, EmailLog } from "@/lib/db/models";
import { StatusBadge } from "@/components/StatusBadge";
import { TestEmailComposer } from "@/components/dashboard/TestEmailComposer";
import { CodeDrawer } from "@/components/dashboard/CodeDrawer";
import { EmailsHeader } from "@/components/emails/EmailsHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { RANGE_OPTIONS, escapeRegex, pageOf, rangeSince, PAGE_SIZE } from "@/lib/filters";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Emails" };

const STATUSES = ["queued", "scheduled", "sent", "delivered", "delivery_delayed", "bounced", "complained", "failed", "canceled"];

export default async function EmailsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const filter: Record<string, unknown> = { workspaceId: workspace._id, createdAt: { $gte: rangeSince(sp.range) } };
  if (sp.q) {
    const rx = { $regex: escapeRegex(sp.q.trim()), $options: "i" };
    filter.$or = [{ to: rx }, { subject: rx }, { from: rx }, { messageId: sp.q.trim() }];
  }
  if (sp.status && STATUSES.includes(sp.status)) filter.status = sp.status;
  if (sp.key) {
    if (isValidObjectId(sp.key)) filter.apiKeyId = sp.key;
    else if (["dashboard", "broadcast", "automation", "smtp", "inbox"].includes(sp.key)) filter.source = sp.key;
  }
  const page = pageOf(sp.page);

  const [total, logs, keys, verifiedDomain] = await Promise.all([
    EmailLog.countDocuments(filter),
    EmailLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).select("messageId to subject status createdAt source scheduledAt opens clicks").lean(),
    ApiKey.find({ workspaceId: workspace._id }).select("name").lean(),
    Domain.findOne({ workspaceId: workspace._id, status: "verified" }).lean(),
  ]);
  const anyEver = total > 0 || (await EmailLog.exists({ workspaceId: workspace._id }));

  return (
    <div>
      <EmailsHeader
        tab="sending"
        actions={
          <>
            <TestEmailComposer defaultFrom={verifiedDomain ? `${workspace.name} <hello@${verifiedDomain.name}>` : ""} />
            <CodeDrawer resource="emails" />
          </>
        }
      />

      <FilterBar
        exportHref="/api/dashboard/emails/export"
        fields={[
          { type: "search", name: "q", placeholder: "Search by recipient, subject or id…" },
          { type: "select", name: "range", defaultValue: "15d", options: RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
          { type: "select", name: "status", options: [{ value: "", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase()) }))] },
          {
            type: "select",
            name: "key",
            options: [
              { value: "", label: "All sources" },
              ...keys.map((k) => ({ value: String(k._id), label: `API key: ${k.name}` })),
              { value: "dashboard", label: "Dashboard" },
              { value: "broadcast", label: "Broadcasts" },
              { value: "automation", label: "Automations" },
              { value: "smtp", label: "SMTP" },
              { value: "inbox", label: "Inboxes" },
            ],
          },
        ]}
      />

      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState
            icon="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
            title={anyEver ? "No emails match these filters" : "No sent emails yet"}
            description={anyEver ? "Try widening the date range or clearing filters." : "Start sending emails to see insights and previews for every message."}
          >
            {!anyEver && <Link href="/onboarding" className="btn btn-primary"><Icon name="send" size={15} /> Send your first email</Link>}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>To</th>
                  <th>Status</th>
                  <th>Subject</th>
                  <th className="hidden md:table-cell">Engagement</th>
                  <th className="text-right">Sent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((e) => (
                  <tr key={e.messageId}>
                    <td className="max-w-[220px] truncate text-fg-muted">{e.to.join(", ")}</td>
                    <td><StatusBadge status={e.status} /></td>
                    <td className="max-w-[340px] truncate">
                      <Link href={`/emails/${e.messageId}`} className="hover:text-accent">{e.subject}</Link>
                    </td>
                    <td className="hidden md:table-cell text-xs text-fg-subtle">{e.opens ? `${e.opens} open${e.opens > 1 ? "s" : ""}` : "-"}{e.clicks ? ` · ${e.clicks} click${e.clicks > 1 ? "s" : ""}` : ""}</td>
                    <td className="text-right text-fg-subtle whitespace-nowrap" title={new Date(e.createdAt).toLocaleString()}>
                      {e.status === "scheduled" && e.scheduledAt ? <><Icon name="clock" size={13} className="mr-1" />{timeAgo(e.scheduledAt)}</> : timeAgo(e.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
