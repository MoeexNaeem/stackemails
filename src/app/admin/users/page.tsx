import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { Workspace, User, Subscription } from "@/lib/db/models";
import { sentThisPeriod } from "@/lib/quota";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { escapeRegex, pageOf, PAGE_SIZE } from "@/lib/filters";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Teams & users" };

type SP = { q?: string; plan?: string; status?: string; page?: string };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  await connectToDatabase();
  const sp = await searchParams;
  const page = pageOf(sp.page);

  const filter: Record<string, unknown> = {};
  if (sp.plan && ["free", "pro", "scale"].includes(sp.plan)) filter.plan = sp.plan;
  if (sp.status && ["active", "restricted", "suspended"].includes(sp.status)) filter.status = sp.status;
  const q = sp.q?.trim();
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    const owners = await User.find({ $or: [{ email: rx }, { name: rx }] }).select("_id").limit(500).lean();
    filter.$or = [{ name: rx }, { ownerId: { $in: owners.map((o) => o._id) } }];
  }

  const [total, workspaces] = await Promise.all([
    Workspace.countDocuments(filter),
    Workspace.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
  ]);
  const [users, subs] = await Promise.all([
    User.find({ _id: { $in: workspaces.map((w) => w.ownerId) } }).select("email name platformRole disabled lastLoginAt").lean(),
    Subscription.find({ workspaceId: { $in: workspaces.map((w) => w._id) } }).select("workspaceId planName priceMonthly").lean(),
  ]);
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const subByWs = new Map(subs.map((s) => [String(s.workspaceId), s]));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">Teams &amp; users</h1>
        <p className="mt-1 text-sm text-fg-muted">{total.toLocaleString()} team{total === 1 ? "" : "s"}{q || sp.plan || sp.status ? (total === 1 ? " matches your filters" : " match your filters") : ""}.</p>
      </div>

      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search team, owner name or email…" },
          { type: "select", name: "plan", options: [{ value: "", label: "All plans" }, { value: "free", label: "Free" }, { value: "pro", label: "Pro" }, { value: "scale", label: "Scale" }] },
          { type: "select", name: "status", options: [{ value: "", label: "All statuses" }, { value: "active", label: "Active" }, { value: "restricted", label: "Restricted" }, { value: "suspended", label: "Suspended" }] },
        ]}
      />

      {workspaces.length === 0 ? (
        <EmptyState title="No teams found" description="Try a different search or clear the filters." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[860px]">
            <thead>
              <tr><th>Team</th><th>Owner</th><th>Plan</th><th>Status</th><th>Usage this period</th><th className="text-right">Joined</th></tr>
            </thead>
            <tbody>
              {workspaces.map((w) => {
                const owner = userById.get(String(w.ownerId));
                const sub = subByWs.get(String(w._id));
                const used = sentThisPeriod(w);
                const pct = Math.min(100, Math.round((used / Math.max(1, w.monthlyQuota)) * 100));
                return (
                  <tr key={String(w._id)}>
                    <td>
                      <Link href={`/admin/users/${w._id}`} className="font-medium hover:text-[var(--violet)]">{w.name}</Link>
                      {owner?.platformRole === "admin" && <span className="badge ml-2" style={{ color: "var(--lime)" }}>admin</span>}
                    </td>
                    <td className="text-fg-muted">
                      {owner?.email ?? "-"}
                      {owner?.disabled && <span className="badge ml-2" style={{ color: "var(--danger)" }}>disabled</span>}
                      {owner?.lastLoginAt && <span className="block text-xs text-fg-subtle">seen {timeAgo(owner.lastLoginAt)}</span>}
                    </td>
                    <td><span className="capitalize">{sub?.planName ?? w.plan}</span>{sub && sub.priceMonthly > 0 && <span className="text-fg-subtle"> · ${sub.priceMonthly}/mo</span>}</td>
                    <td><span className="badge capitalize" style={w.status !== "active" ? { color: w.status === "suspended" ? "var(--danger)" : "var(--warning, #f59e0b)" } : undefined}>{w.status}</span></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg-hover"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? "var(--danger)" : "var(--violet)" }} /></div>
                        <span className="text-xs text-fg-muted">{used.toLocaleString()} / {w.monthlyQuota.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="text-right text-fg-subtle">{new Date(w.createdAt).toLocaleDateString()}</td>
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
