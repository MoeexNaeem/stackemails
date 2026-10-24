import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { Workspace, EmailLog, Subscription } from "@/lib/db/models";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  await connectToDatabase();

  // Signups per month (6 months)
  const since6 = new Date(); since6.setMonth(since6.getMonth() - 5); since6.setDate(1); since6.setHours(0, 0, 0, 0);
  // Emails per day (14 days)
  const since14 = new Date(); since14.setDate(since14.getDate() - 13); since14.setHours(0, 0, 0, 0);

  const [workspaces, emails, subs] = await Promise.all([
    Workspace.find({ createdAt: { $gte: since6 } }).select("createdAt").lean(),
    EmailLog.find({ createdAt: { $gte: since14 } }).select("createdAt status").lean(),
    Subscription.find().select("planName").lean(),
  ]);

  // Signups buckets
  const signupMonths: { label: string; n: number }[] = [];
  const sIdx = new Map<string, number>();
  for (let i = 0; i < 6; i++) { const d = new Date(since6); d.setMonth(since6.getMonth() + i); sIdx.set(`${d.getFullYear()}-${d.getMonth()}`, signupMonths.length); signupMonths.push({ label: d.toLocaleDateString(undefined, { month: "short" }), n: 0 }); }
  for (const w of workspaces) { const d = new Date(w.createdAt); const i = sIdx.get(`${d.getFullYear()}-${d.getMonth()}`); if (i !== undefined) signupMonths[i].n++; }
  const maxSignup = Math.max(1, ...signupMonths.map((m) => m.n));

  // Emails per day
  const days: { label: string; n: number; delivered: number }[] = [];
  const dIdx = new Map<string, number>();
  for (let i = 0; i < 14; i++) { const d = new Date(since14); d.setDate(since14.getDate() + i); const key = d.toISOString().slice(0, 10); dIdx.set(key, days.length); days.push({ label: d.toLocaleDateString(undefined, { day: "2-digit" }), n: 0, delivered: 0 }); }
  for (const e of emails) { const key = new Date(e.createdAt).toISOString().slice(0, 10); const i = dIdx.get(key); if (i !== undefined) { days[i].n++; if (e.status === "delivered" || e.status === "sent") days[i].delivered++; } }
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  // Plan distribution
  const planDist = new Map<string, number>();
  for (const s of subs) planDist.set(s.planName, (planDist.get(s.planName) ?? 0) + 1);
  const plans = [...planDist.entries()].sort((a, b) => b[1] - a[1]);
  const maxPlan = Math.max(1, ...plans.map(([, n]) => n));

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-6">Analytics</h1>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="font-semibold mb-5">New tenants / month</h2>
          <div className="flex items-end gap-3 h-40">
            {signupMonths.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center justify-end gap-2">
                <span className="text-xs text-fg-muted">{m.n}</span>
                <div className="w-full rounded-t" style={{ height: `${(m.n / maxSignup) * 100}%`, minHeight: 2, background: "var(--accent)" }} />
                <span className="text-xs text-fg-subtle">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-5">Plan distribution</h2>
          <div className="space-y-3">
            {plans.map(([name, n]) => (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1"><span>{name}</span><span className="text-fg-muted">{n}</span></div>
                <div className="h-2 rounded-full bg-bg-hover overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(n / maxPlan) * 100}%`, background: "var(--accent)" }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-5">Emails sent in the last 14 days</h2>
        <div className="flex items-end gap-2 h-44">
          {days.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t" style={{ height: `${(d.n / maxDay) * 100}%`, minHeight: 2, background: "var(--success)" }} title={`${d.n} sent`} />
              <span className="text-[10px] text-fg-subtle">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
