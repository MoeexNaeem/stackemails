import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";

export const dynamic = "force-dynamic";

const DAYS = 15;

export default async function MetricsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const since = new Date();
  since.setDate(since.getDate() - (DAYS - 1));
  since.setHours(0, 0, 0, 0);

  const logs = await EmailLog.find({
    workspaceId: workspace._id,
    createdAt: { $gte: since },
  })
    .select("createdAt status")
    .lean();

  // Bucket by day.
  const buckets: { label: string; count: number }[] = [];
  const byDay = new Map<string, number>();
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, 0);
    buckets.push({
      label: d.toLocaleDateString(undefined, { month: "short", day: "2-digit" }),
      count: 0,
    });
  }
  let total = 0;
  let delivered = 0;
  for (const l of logs) {
    const key = new Date(l.createdAt).toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    total++;
    if (l.status === "delivered" || l.status === "sent") delivered++;
  }
  let i = 0;
  for (const [, v] of byDay) buckets[i++].count = v;

  const deliverability = total > 0 ? Math.round((delivered / total) * 100) : 100;
  const max = Math.max(1, ...buckets.map((b) => b.count));

  // Build SVG area/line path.
  const W = 1000;
  const H = 320;
  const padX = 8;
  const padY = 20;
  const stepX = (W - padX * 2) / (DAYS - 1);
  const points = buckets.map((b, idx) => {
    const x = padX + idx * stepX;
    const y = padY + (H - padY * 2) * (1 - b.count / max);
    return [x, y] as const;
  });
  const linePath = points.map(([x, y], idx) => `${idx === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0]},${H - padY} L${points[0][0]},${H - padY} Z`;

  return (
    <div>
      <PageHeader
        title="Metrics"
        description="Delivery performance across your workspace."
        action={
          <div className="flex gap-2">
            <span className="btn btn-secondary">All domains ▾</span>
            <span className="btn btn-secondary">Last 15 days ▾</span>
          </div>
        }
      />

      <div className="card p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex gap-10">
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-subtle">Emails</p>
              <p className="mt-1 text-3xl font-semibold">{total.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-subtle">Deliverability rate</p>
              <p className="mt-1 text-3xl font-semibold">{deliverability}%</p>
            </div>
          </div>
          <span className="btn btn-secondary">All Events ▾</span>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 320 }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <line
                key={f}
                x1={padX}
                x2={W - padX}
                y1={padY + (H - padY * 2) * f}
                y2={padY + (H - padY * 2) * f}
                stroke="var(--border)"
                strokeDasharray="4 6"
              />
            ))}
            <path d={areaPath} fill="url(#metricFill)" />
            <path d={linePath} fill="none" stroke="var(--success)" strokeWidth="2" />
            {points.map(([x, y], idx) => (
              <circle key={idx} cx={x} cy={y} r="3" fill="var(--success)" />
            ))}
          </svg>
          <div className="flex justify-between mt-2 text-[11px] text-fg-subtle">
            {buckets.map((b, idx) => (
              <span key={idx} className={idx % 2 === 0 ? "" : "opacity-0 sm:opacity-100"}>
                {b.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border text-sm">
          <span className="w-2 h-2 rounded-full" style={{ background: "var(--success)" }} />
          <span className="text-fg-muted">Delivered</span>
          <span className="ml-auto font-medium">{deliverability}%</span>
        </div>
      </div>
    </div>
  );
}
