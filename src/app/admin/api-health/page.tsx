import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiLog } from "@/lib/db/models";
import { env } from "@/lib/env";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

const PIPELINE = [
  "Client / SDK", "API Gateway (auth + rate limit)", "Validate + quota",
  "Redis queue (BullMQ)", "Worker", "Amazon SES", "SNS events", "/webhooks/ses", "MongoDB",
];

export default async function AdminApiHealthPage() {
  await requireAdmin();
  await connectToDatabase();

  const since24 = new Date(Date.now() - 24 * 3600 * 1000);
  const since14d = new Date(Date.now() - 14 * 24 * 3600 * 1000);

  const [byEndpoint, overall, statusDist, daily] = await Promise.all([
    ApiLog.aggregate([
      { $match: { createdAt: { $gte: since24 } } },
      { $group: { _id: "$endpoint", total: { $sum: 1 }, errors: { $sum: { $cond: [{ $gte: ["$status", 400] }, 1, 0] } }, avg: { $avg: "$durationMs" } } },
      { $sort: { total: -1 } },
    ]),
    ApiLog.aggregate([
      { $match: { createdAt: { $gte: since24 } } },
      { $group: { _id: null, total: { $sum: 1 }, errors: { $sum: { $cond: [{ $gte: ["$status", 400] }, 1, 0] } } } },
    ]),
    ApiLog.aggregate([
      { $match: { createdAt: { $gte: since24 } } },
      { $group: { _id: "$status", n: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    ApiLog.aggregate([
      { $match: { createdAt: { $gte: since14d } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
    ]),
  ]);

  const total24 = overall[0]?.total ?? 0;
  const err24 = overall[0]?.errors ?? 0;
  const errRate = total24 > 0 ? ((err24 / total24) * 100).toFixed(1) : "0.0";

  const services = [
    { name: "REST API", ok: true, note: `${total24} reqs / 24h` },
    { name: "Queue (BullMQ / Redis)", ok: env.queueDriver === "bullmq", note: env.queueDriver },
    { name: "Email provider", ok: true, note: env.emailProvider.toUpperCase() },
    { name: "Database (MongoDB)", ok: true, note: "connected" },
    { name: "Rate limiter", ok: true, note: env.rateLimitDriver },
  ];

  const dailyMap = new Map(daily.map((d) => [d._id, d.n]));
  const days: { label: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    days.push({ label: d.toLocaleDateString(undefined, { day: "2-digit" }), n: dailyMap.get(d.toISOString().slice(0, 10)) ?? 0 });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-6">API Health</h1>

      {/* Service status */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {services.map((s) => (
          <div key={s.name} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: s.ok ? "var(--success)" : "var(--warning)" }} />
              <span className="text-sm font-medium">{s.name}</span>
            </div>
            <p className="text-xs text-fg-subtle mt-1 capitalize">{s.ok ? "Operational" : "Degraded"} · {s.note}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ l: "Requests (24h)", v: total24.toLocaleString() }, { l: "Errors (24h)", v: err24.toLocaleString() }, { l: "Error rate", v: `${errRate}%` }].map((s) => (
          <div key={s.l} className="card p-5"><p className="text-sm text-fg-muted">{s.l}</p><p className="mt-2 text-3xl font-semibold">{s.v}</p></div>
        ))}
      </div>

      {/* Pipeline diagram */}
      <div className="card p-6 mb-6 overflow-x-auto">
        <h2 className="font-semibold mb-4">Request pipeline</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {PIPELINE.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="rounded-lg px-3 py-2 text-xs font-medium text-center" style={{ background: "var(--bg-hover)", border: "1px solid var(--border-strong)" }}>{step}</span>
              {i < PIPELINE.length - 1 && <Icon name="chevron-right" size={14} className="text-fg-subtle" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Endpoint table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold">Endpoints (24h)</h2></div>
          {byEndpoint.length === 0 ? (
            <p className="px-5 py-8 text-center text-fg-muted text-sm">No API traffic in the last 24h.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-fg-subtle border-b border-border"><th className="px-5 py-2 font-medium">Endpoint</th><th className="px-5 py-2 font-medium">Reqs</th><th className="px-5 py-2 font-medium">Errors</th><th className="px-5 py-2 font-medium text-right">Avg ms</th></tr></thead>
              <tbody>
                {byEndpoint.map((e) => (
                  <tr key={e._id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5 mono">{e._id}</td>
                    <td className="px-5 py-2.5">{e.total}</td>
                    <td className="px-5 py-2.5" style={{ color: e.errors > 0 ? "var(--danger)" : undefined }}>{e.errors}</td>
                    <td className="px-5 py-2.5 text-right text-fg-muted">{Math.round(e.avg ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Request volume chart */}
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Requests in the last 14 days</h2>
          <div className="flex items-end gap-2 h-40">
            {days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t" style={{ height: `${(d.n / maxDay) * 100}%`, minHeight: 2, background: "var(--accent)" }} />
                <span className="text-[10px] text-fg-subtle">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusDist.map((s) => (
              <span key={s._id} className="badge" style={{ background: "var(--bg-hover)", color: s._id >= 400 ? "var(--danger)" : "var(--fg-muted)" }}>
                {s._id}: {s.n}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
