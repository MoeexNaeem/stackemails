import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { ContactMessage, Domain, SupportTicket, Subscription, SystemEmailLog, Transaction, User, Workspace } from "@/lib/db/models";
import { emailSeries, emailTotals, rate, utcWindowStart } from "@/lib/analytics";
import { StatCard, pctChange } from "@/components/ui/StatCard";
import { AreaChart, DonutChart, PillBarChart } from "@/components/ui/Charts";
import { RangeToggle } from "@/components/ui/RangeToggle";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview" };

const RANGES = { "7d": { days: 7, g: "day" as const }, "1m": { days: 30, g: "day" as const }, "3m": { days: 91, g: "week" as const } };
const money = (n: number) => "$" + n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin();
  await connectToDatabase();
  const { range: raw } = await searchParams;
  const range = (raw && raw in RANGES ? raw : "1m") as keyof typeof RANGES;
  const { days, g } = RANGES[range];
  const from = utcWindowStart(days);
  const prevFrom = new Date(from.getTime() - days * 86_400_000);
  const now = new Date(Date.now() + 60_000);

  const [cur, prev, series, teams, users, newUsers, prevNewUsers, activeSubs, revenueAgg, signups, planMix, openTickets, newMessages, verifiedDomains, failedSystem, recentTeams, recentTickets] = await Promise.all([
    emailTotals(null, from, now),
    emailTotals(null, prevFrom, from),
    emailSeries(null, from, days, g),
    Workspace.countDocuments(),
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: from } }),
    User.countDocuments({ createdAt: { $gte: prevFrom, $lt: from } }),
    Subscription.find({ status: "active", priceMonthly: { $gt: 0 } }).select("priceMonthly").lean(),
    Transaction.aggregate([{ $match: { status: "paid", createdAt: { $gte: from } } }, { $group: { _id: null, sum: { $sum: "$amount" } } }]),
    User.aggregate([
      { $match: { createdAt: { $gte: from } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
    ]),
    Workspace.aggregate([{ $group: { _id: "$plan", n: { $sum: 1 } } }]),
    SupportTicket.countDocuments({ status: "open" }),
    ContactMessage.countDocuments({ status: "new" }),
    Domain.countDocuments({ status: "verified" }),
    SystemEmailLog.countDocuments({ status: "failed", createdAt: { $gte: from } }),
    Workspace.find().sort({ createdAt: -1 }).limit(6).select("name plan status createdAt").lean(),
    SupportTicket.find({ status: { $in: ["open", "pending"] } }).sort({ lastActivityAt: -1 }).limit(5).select("number subject email status lastActivityAt").lean(),
  ]);

  const mrr = activeSubs.reduce((s, x) => s + (x.priceMonthly ?? 0), 0);
  const signupByDay = new Map(signups.map((s) => [s._id as string, s.n as number]));
  const signupBars = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const d = new Date(Date.now() - (Math.min(days, 30) - 1 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return { label: d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }), sub: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }), value: signupByDay.get(key) ?? 0 };
  });
  const PLAN_COLORS: Record<string, string> = { free: "var(--fg-subtle)", pro: "var(--violet)", scale: "var(--lime)" };
  const slices = planMix.map((p) => ({ label: String(p._id ?? "free"), value: p.n as number, color: PLAN_COLORS[String(p._id)] ?? "var(--accent)" }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-normal tracking-[-0.02em]">Platform overview</h1>
          <p className="mt-1 text-sm text-fg-muted">Every team, every email — across Stack Emails.</p>
        </div>
        <RangeToggle value={range} options={[{ value: "7d", label: "7 days" }, { value: "1m", label: "1 month" }, { value: "3m", label: "3 months" }]} />
      </div>

      {(openTickets > 0 || newMessages > 0 || failedSystem > 0) && (
        <div className="flex flex-wrap gap-2">
          {openTickets > 0 && <Link href="/admin/support?status=open" className="btn btn-secondary btn-sm">{openTickets} open ticket{openTickets === 1 ? "" : "s"} →</Link>}
          {newMessages > 0 && <Link href="/admin/messages?status=new" className="btn btn-secondary btn-sm">{newMessages} new message{newMessages === 1 ? "" : "s"} →</Link>}
          {failedSystem > 0 && <Link href="/admin/system-emails?status=failed" className="btn btn-secondary btn-sm" style={{ color: "var(--danger)" }}>{failedSystem} failed system email{failedSystem === 1 ? "" : "s"} →</Link>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Emails sent" value={cur.sent.toLocaleString()} delta={pctChange(cur.sent, prev.sent)} trend={series.map((b) => b.sent)} />
        <StatCard label="Delivery rate" value={`${rate(cur.delivered, cur.sent).toFixed(1)}%`} delta={pctChange(rate(cur.delivered, cur.sent), rate(prev.delivered, prev.sent))} />
        <StatCard label="New users" value={newUsers.toLocaleString()} delta={pctChange(newUsers, prevNewUsers)} hint={`${users.toLocaleString()} total`} />
        <StatCard label="MRR" value={money(mrr)} hint={`${activeSubs.length} paying · ${money(revenueAgg[0]?.sum ?? 0)} this period`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="card-title">Sending volume</h2>
            <span className="text-xs text-fg-subtle">{cur.bounced.toLocaleString()} bounced · {cur.complained.toLocaleString()} complaints</span>
          </div>
          <AreaChart data={series.map((b) => ({ label: b.label, sub: b.sub, value: b.sent }))} height={240} />
        </div>
        <div className="card p-5">
          <h2 className="card-title mb-4">Teams by plan</h2>
          <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
            <DonutChart slices={slices} size={170} centerLabel={teams.toLocaleString()} />
            <ul className="space-y-2 text-sm">
              {slices.map((s) => (
                <li key={s.label} className="flex items-center gap-2 capitalize"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}<span className="text-fg-subtle">{s.value}</span></li>
              ))}
              <li className="pt-2 text-fg-subtle">{verifiedDomains} verified domains</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="card p-5">
          <h2 className="card-title mb-4">Signups (last {Math.min(days, 30)} days)</h2>
          <PillBarChart data={signupBars} height={200} />
        </div>
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="card-title">Needs attention</h2>
            <Link href="/admin/support" className="text-sm text-fg-muted hover:text-fg">All tickets →</Link>
          </div>
          {recentTickets.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-fg-muted">Inbox zero — no open tickets. 🎉</p>
          ) : (
            <ul>
              {recentTickets.map((t) => (
                <li key={String(t._id)} className="border-t border-border">
                  <Link href={`/admin/support/${t._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-bg-hover">
                    <span className="mono text-xs text-fg-subtle">#{t.number}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{t.subject}<span className="block truncate text-xs text-fg-subtle">{t.email}</span></span>
                    <span className="badge capitalize">{t.status}</span>
                    <span className="text-xs text-fg-subtle">{timeAgo(t.lastActivityAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="card-title">Recent teams</h2>
          <Link href="/admin/users" className="text-sm text-fg-muted hover:text-fg">View all →</Link>
        </div>
        <table className="table">
          <tbody>
            {recentTeams.map((w) => (
              <tr key={String(w._id)}>
                <td><Link href={`/admin/users/${w._id}`} className="font-medium hover:text-[var(--violet)]">{w.name}</Link></td>
                <td className="capitalize text-fg-muted">{w.plan}</td>
                <td><span className="badge capitalize" style={w.status !== "active" ? { color: "var(--danger)" } : undefined}>{w.status}</span></td>
                <td className="text-right text-fg-subtle">{timeAgo(w.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
