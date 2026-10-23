import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { SystemEmailLog } from "@/lib/db/models";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { escapeRegex, pageOf, PAGE_SIZE } from "@/lib/filters";
import { timeAgo } from "@/lib/format";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "System emails" };

const KINDS = ["welcome", "password_reset", "password_changed", "receipt", "invite", "ticket_opened", "ticket_reply", "ticket_alert", "contact_form", "account_notice"];

export default async function SystemEmailsPage({ searchParams }: { searchParams: Promise<{ q?: string; kind?: string; status?: string; page?: string }> }) {
  await requireAdmin();
  await connectToDatabase();
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const filter: Record<string, unknown> = {};
  if (sp.kind && KINDS.includes(sp.kind)) filter.kind = sp.kind;
  if (sp.status === "sent" || sp.status === "failed") filter.status = sp.status;
  if (sp.q?.trim()) filter.to = { $regex: escapeRegex(sp.q.trim().toLowerCase()) };
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [total, rows, sent7, failed7] = await Promise.all([
    SystemEmailLog.countDocuments(filter),
    SystemEmailLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    SystemEmailLog.countDocuments({ status: "sent", createdAt: { $gte: since } }),
    SystemEmailLog.countDocuments({ status: "failed", createdAt: { $gte: since } }),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">System emails</h1>
        <p className="mt-1 text-sm text-fg-muted">Platform mail sent from <span className="mono">{env.systemFromEmail}</span> · last 7 days: {sent7} sent, <span style={failed7 ? { color: "var(--danger)" } : undefined}>{failed7} failed</span> · kept 90 days.</p>
      </div>
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search recipient…" },
          { type: "select", name: "kind", options: [{ value: "", label: "All kinds" }, ...KINDS.map((k) => ({ value: k, label: k.replace(/_/g, " ") }))] },
          { type: "select", name: "status", options: [{ value: "", label: "All statuses" }, { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }] },
        ]}
      />
      {rows.length === 0 ? (
        <div className="card"><EmptyState title="No system emails" description="Welcome, password reset, receipt and ticket emails will be logged here." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead><tr><th>Kind</th><th>To</th><th>Subject</th><th>Status</th><th className="text-right">When</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r._id)}>
                  <td className="capitalize text-fg-muted">{r.kind.replace(/_/g, " ")}</td>
                  <td className="mono text-xs">{r.to}</td>
                  <td className="max-w-[320px]">
                    <span className="block truncate">{r.subject}</span>
                    {r.error && <span className="block truncate text-xs" style={{ color: "var(--danger)" }} title={r.error}>{r.error}</span>}
                  </td>
                  <td><span className="badge capitalize" style={{ color: r.status === "sent" ? "var(--success)" : "var(--danger)" }}>{r.status}</span></td>
                  <td className="text-right text-fg-subtle" title={new Date(r.createdAt).toLocaleString()}>{timeAgo(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
