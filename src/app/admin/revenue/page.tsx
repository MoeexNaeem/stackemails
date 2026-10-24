import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { Transaction, Subscription } from "@/lib/db/models";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";
const money = (n: number) => "$" + n.toLocaleString();

export default async function AdminRevenuePage() {
  await requireAdmin();
  await connectToDatabase();

  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [activeSubs, totalAgg, monthAgg, byPlan, txns, chartTx] = await Promise.all([
    Subscription.find({ status: "active", priceMonthly: { $gt: 0 } }).lean(),
    Transaction.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, sum: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { status: "paid", createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }, { $group: { _id: null, sum: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$planName", sum: { $sum: "$amount" }, n: { $sum: 1 } } }, { $sort: { sum: -1 } }]),
    Transaction.find().sort({ createdAt: -1 }).limit(20).lean(),
    Transaction.find({ status: "paid", createdAt: { $gte: since } }).select("amount createdAt").lean(),
  ]);

  const mrr = activeSubs.reduce((s, x) => s + (x.priceMonthly ?? 0), 0);
  const total = totalAgg[0]?.sum ?? 0;
  const thisMonth = monthAgg[0]?.sum ?? 0;

  const months: { label: string; total: number }[] = [];
  const idx = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(since); d.setMonth(since.getMonth() + i);
    idx.set(`${d.getFullYear()}-${d.getMonth()}`, months.length);
    months.push({ label: d.toLocaleDateString(undefined, { month: "short" }), total: 0 });
  }
  for (const t of chartTx) {
    const d = new Date(t.createdAt);
    const i = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) months[i].total += t.amount;
  }
  const maxRev = Math.max(1, ...months.map((m) => m.total));

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-6">Revenue</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[{ l: "MRR", v: money(mrr) }, { l: "This month", v: money(thisMonth) }, { l: "Total revenue", v: money(total) }].map((s) => (
          <div key={s.l} className="card p-5"><p className="text-sm text-fg-muted">{s.l}</p><p className="mt-2 text-3xl font-semibold">{s.v}</p></div>
        ))}
      </div>

      <div className="card p-6 mb-8">
        <h2 className="font-semibold mb-5">Revenue over the last 6 months</h2>
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

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="card p-5 h-fit">
          <h2 className="font-semibold mb-3">By plan</h2>
          <div className="space-y-3">
            {byPlan.map((p) => (
              <div key={p._id} className="flex items-center justify-between text-sm">
                <span>{p._id || "-"}</span>
                <span className="text-fg-muted">{money(p.sum)} · {p.n} txns</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold">Recent transactions</h2></div>
          <table className="w-full text-sm">
            <tbody>
              {txns.map((t) => (
                <tr key={String(t._id)} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-5 py-3"><Link href={`/admin/users/${t.workspaceId}`} className="font-medium hover:text-accent">{t.workspaceName || "-"}</Link></td>
                  <td className="px-5 py-3 text-fg-muted capitalize">{t.type} · {t.planName}</td>
                  <td className="px-5 py-3">{money(t.amount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={t.status === "paid" ? "delivered" : "failed"} /></td>
                  <td className="px-5 py-3 text-right text-fg-subtle">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
