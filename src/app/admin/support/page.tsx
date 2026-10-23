import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { SupportTicket } from "@/lib/db/models";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { escapeRegex, pageOf, PAGE_SIZE } from "@/lib/filters";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Support" };

const STATUSES = ["open", "pending", "resolved", "closed"];
const CATEGORIES = ["general", "billing", "deliverability", "domains", "api", "bug", "account"];
const PRIORITY_COLOR: Record<string, string> = { urgent: "var(--danger)", high: "#f59e0b", normal: "var(--fg-muted)", low: "var(--fg-subtle)" };

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }> }) {
  await requireAdmin();
  await connectToDatabase();
  const sp = await searchParams;
  const page = pageOf(sp.page);
  const filter: Record<string, unknown> = {};
  if (sp.status && STATUSES.includes(sp.status)) filter.status = sp.status;
  if (sp.category && CATEGORIES.includes(sp.category)) filter.category = sp.category;
  const q = sp.q?.trim();
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ subject: rx }, { email: rx }, ...(/^\d+$/.test(q) ? [{ number: Number(q) }] : [])];
  }
  const [total, tickets, counts] = await Promise.all([
    SupportTicket.countDocuments(filter),
    SupportTicket.find(filter).sort({ status: 1, lastActivityAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).select("number subject email category priority status messages lastActivityAt").lean(),
    SupportTicket.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c._id, c.n]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">Support</h1>
        <p className="mt-1 text-sm text-fg-muted">{count.open ?? 0} open · {count.pending ?? 0} waiting on customer · {count.resolved ?? 0} resolved</p>
      </div>
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search subject, email or #number…" },
          { type: "select", name: "status", options: [{ value: "", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))] },
          { type: "select", name: "category", options: [{ value: "", label: "All categories" }, ...CATEGORIES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))] },
        ]}
      />
      {tickets.length === 0 ? (
        <div className="card"><EmptyState title="No tickets" description="Tickets opened from Help in the dashboard appear here." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[800px]">
            <thead><tr><th>#</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th className="text-right">Last activity</th></tr></thead>
            <tbody>
              {tickets.map((t) => {
                const last = t.messages?.[t.messages.length - 1];
                return (
                  <tr key={String(t._id)}>
                    <td className="mono text-xs text-fg-subtle">{t.number}</td>
                    <td>
                      <Link href={`/admin/support/${t._id}`} className="font-medium hover:text-[var(--violet)]">{t.subject}</Link>
                      <span className="block text-xs text-fg-subtle">{t.email}{last ? ` · last reply by ${last.author}` : ""}</span>
                    </td>
                    <td className="capitalize text-fg-muted">{t.category}</td>
                    <td className="capitalize" style={{ color: PRIORITY_COLOR[t.priority] }}>{t.priority}</td>
                    <td><span className="badge capitalize" style={t.status === "open" ? { color: "var(--violet)" } : undefined}>{t.status}</span></td>
                    <td className="text-right text-fg-subtle">{timeAgo(t.lastActivityAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
