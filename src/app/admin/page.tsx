import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { Workspace, User, Subscription, Transaction, EmailLog } from "@/lib/db/models";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function money(n: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  await connectToDatabase();

  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [workspaces, users, activeSubs, revenueAgg, emailsTotal, txForChart, recent] = await Promise.all([
    Workspace.countDocuments(),
    User.countDocuments(),
    Subscription.find({ status: "active", priceMonthly: { $gt: 0 } }).lean(),
    Transaction.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, sum: { $sum: "$amount" } } }]),
    EmailLog.estimatedDocumentCount(),
    Transaction.find({ status: "paid", createdAt: { $gte: since } }).select("amount createdAt").lean(),
    Workspace.find().sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const mrr = activeSubs.reduce((s, x) => s + (x.priceMonthly ?? 0), 0);
  const totalRevenue = revenueAgg[0]?.sum ?? 0;

  // Monthly revenue buckets (last 6 months).
  const months: { label: string; total: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    idx.set(key, months.length);
    months.push({ label: d.toLocaleDateString(undefined, { month: "short" }), total: 0 });
  }
  for (const t of txForChart) {
    const d = new Date(t.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const i = idx.get(key);
    if (i !== undefined) months[i].total += t.amount;
  }
  const maxRev = Math.max(1, ...months.map((m) => m.total));

  const stats = [
    { label: "Tenants", value: workspaces.toLocaleString() },
    { label: "Users", value: users.toLocaleString() },
    { label: "Active subscriptions", value: activeSubs.length.toLocaleString() },
    { label: "MRR", value: money(mrr) },
    { label: "Total revenue", value: money(totalRevenue) },
    { label: "Emails sent", value: emailsTotal.toLocaleString() },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Overview</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-fg-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold">Revenue — last 6 months</h2>
          <span className="text-sm text-fg-muted">Total {money(months.reduce((s, m) => s + m.total, 0))}</span>
        </div>
        <div className="flex items-end gap-4 h-48">
          {months.map((m) => (
            <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-2">
              <span className="text-xs text-fg-muted">{money(m.total)}</span>
              <div className="w-full rounded-t" style={{ height: `${(m.total / maxRev) * 100}%`, minHeight: 2, background: "var(--accent)" }} />
              <span className="text-xs text-fg-subtle">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Recent signups</h2>
          <Link href="/admin/users" className="text-sm text-accent hover:underline">View all</Link>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {recent.map((w) => (
              <tr key={String(w._id)} className="border-b border-border last:border-0 hover:bg-bg-hover">
                <td className="px-5 py-3">
                  <Link href={`/admin/users/${w._id}`} className="font-medium hover:text-accent">{w.name}</Link>
                </td>
                <td className="px-5 py-3"><StatusBadge status={w.status === "active" ? "verified" : w.status === "restricted" ? "pending" : "failed"} /></td>
                <td className="px-5 py-3 text-fg-muted capitalize">{w.plan}</td>
                <td className="px-5 py-3 text-right text-fg-subtle">{new Date(w.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
