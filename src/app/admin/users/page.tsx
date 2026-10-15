import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { Workspace, User, Subscription } from "@/lib/db/models";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireAdmin();
  await connectToDatabase();

  const workspaces = await Workspace.find().sort({ createdAt: -1 }).lean();
  const [users, subs] = await Promise.all([
    User.find({ _id: { $in: workspaces.map((w) => w.ownerId) } }).lean(),
    Subscription.find({ workspaceId: { $in: workspaces.map((w) => w._id) } }).lean(),
  ]);
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const subByWs = new Map(subs.map((s) => [String(s.workspaceId), s]));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Users &amp; tenants</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input flex-1 min-w-[200px]" placeholder="Search..." />
        <span className="btn btn-secondary">All plans ▾</span>
        <span className="btn btn-secondary">All statuses ▾</span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-subtle border-b border-border">
              <th className="px-5 py-3 font-medium">Tenant</th>
              <th className="px-5 py-3 font-medium">Owner</th>
              <th className="px-5 py-3 font-medium">Plan</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Usage (mo)</th>
              <th className="px-5 py-3 font-medium text-right">Joined</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((w) => {
              const owner = userById.get(String(w.ownerId));
              const sub = subByWs.get(String(w._id));
              const used = w.usage?.sent ?? 0;
              return (
                <tr key={String(w._id)} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-5 py-3">
                    <Link href={`/admin/users/${w._id}`} className="font-medium hover:text-accent">{w.name}</Link>
                    {owner?.platformRole === "admin" && <span className="badge ml-2" style={{ background: "color-mix(in srgb, var(--danger) 14%, transparent)", color: "var(--danger)" }}>admin</span>}
                  </td>
                  <td className="px-5 py-3 text-fg-muted">{owner?.email ?? "—"}</td>
                  <td className="px-5 py-3">
                    <span className="capitalize">{sub?.planName ?? w.plan}</span>
                    {sub && sub.priceMonthly > 0 && <span className="text-fg-subtle"> · ${sub.priceMonthly}/mo</span>}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={w.status === "active" ? "verified" : w.status === "restricted" ? "pending" : "failed"} /></td>
                  <td className="px-5 py-3 text-fg-muted">{used.toLocaleString()} / {w.monthlyQuota.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right text-fg-subtle">{new Date(w.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
