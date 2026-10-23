import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain } from "@/lib/db/models";
import { emailSeries, emailTotals, rate, utcWindowStart } from "@/lib/analytics";
import { rangeDays, RANGE_OPTIONS } from "@/lib/filters";
import { FilterBar } from "@/components/ui/FilterBar";
import { AreaChart } from "@/components/ui/Charts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Metrics" };

const EVENTS = [
  { value: "", label: "All events" },
  { value: "delivered", label: "Delivered" },
  { value: "opened", label: "Opened" },
  { value: "clicked", label: "Clicked" },
  { value: "bounced", label: "Bounced" },
  { value: "complained", label: "Complained" },
  { value: "failed", label: "Failed" },
] as const;

export default async function MetricsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const days = rangeDays(sp.range);
  const from = utcWindowStart(days);
  const to = new Date(Date.now() + 60_000);
  const domains = await Domain.find({ workspaceId: workspace._id }).select("name").lean();
  const domain = sp.domain && domains.some((d) => d.name === sp.domain) ? sp.domain : undefined;
  const event = EVENTS.find((e) => e.value === sp.event)?.value ?? "";

  const [t, series] = await Promise.all([emailTotals(workspace._id, from, to, { domain }), emailSeries(workspace._id, from, days, "day", { domain })]);
  const metric = (b: (typeof series)[number]) => (event ? (b as unknown as Record<string, number>)[event] : b.total);
  const deliverability = rate(t.delivered, t.sent);
  const bounceRate = rate(t.bounced, t.sent);
  const complaintRate = rate(t.complained, t.sent);
  const bounceSeries = series.map((b) => ({ label: b.label, sub: b.sub, value: Number(rate(b.bounced, b.sent).toFixed(2)) }));
  const complaintSeries = series.map((b) => ({ label: b.label, sub: b.sub, value: Number(rate(b.complained, b.sent).toFixed(3)) }));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">Metrics</h1>
      </div>
      <FilterBar
        fields={[
          { type: "select", name: "domain", options: [{ value: "", label: "All domains" }, ...domains.map((d) => ({ value: d.name, label: d.name }))] },
          { type: "select", name: "range", defaultValue: "15d", options: RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
          { type: "select", name: "event", options: EVENTS.map((e) => ({ value: e.value, label: e.label })) },
        ]}
      />

      <div className="card p-6">
        <div className="flex flex-wrap gap-10 mb-6">
          <Figure label="Emails" value={t.total.toLocaleString()} />
          <Figure label="Deliverability rate" value={`${deliverability.toFixed(1)}%`} />
          <Figure label="Opened" value={`${rate(t.opened, t.sent).toFixed(1)}%`} />
          <Figure label="Clicked" value={`${rate(t.clicked, t.sent).toFixed(1)}%`} />
        </div>
        <AreaChart data={series.map((b) => ({ label: b.label, sub: b.sub, value: metric(b) }))} color={event === "bounced" || event === "failed" ? "var(--danger)" : event === "complained" ? "var(--warning)" : "var(--violet)"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RateCard
          title="Bounce rate"
          value={bounceRate}
          digits={2}
          data={bounceSeries}
          yMax={10}
          color="var(--danger)"
          threshold={4}
          rows={[
            { label: "Transient", count: t.bounceTransient },
            { label: "Permanent", count: t.bouncePermanent },
            { label: "Undetermined", count: t.bounceUndetermined },
          ]}
          sent={t.sent}
          help="Keep bounces under 4%. Permanent bounces are suppressed automatically."
        />
        <RateCard
          title="Complaint rate"
          value={complaintRate}
          digits={3}
          data={complaintSeries}
          yMax={0.2}
          color="var(--warning)"
          threshold={0.08}
          rows={[{ label: "Complained", count: t.complained }]}
          sent={t.sent}
          help="Inbox providers start filtering above 0.08%; Gmail's hard limit is 0.3%."
        />
      </div>
      <p className="mt-4 text-xs text-fg-subtle">Data updates in real time as delivery events arrive from Amazon SES.</p>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 text-[28px] font-normal leading-none tracking-tight">{value}</p>
    </div>
  );
}

function RateCard({
  title, value, digits, data, yMax, color, threshold, rows, sent, help,
}: {
  title: string; value: number; digits: number; data: { label: string; sub: string; value: number }[]; yMax: number; color: string; threshold: number; rows: { label: string; count: number }[]; sent: number; help: string;
}) {
  const risk = value >= threshold;
  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="mt-1 text-[28px] font-normal leading-none">{value.toFixed(digits)}%</p>
        </div>
        <span className="badge" style={{ color: risk ? "var(--danger)" : "var(--lime)", background: `color-mix(in srgb, ${risk ? "var(--danger)" : "var(--lime)"} 14%, transparent)` }}>{risk ? "At risk" : "Healthy"}</span>
      </div>
      <div className="mt-5">
        <AreaChart data={data} height={160} color={color} yMax={yMax} unit="percent" />
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <p className="eyebrow mb-2">Risk</p>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between py-1 text-sm">
            <span className="text-fg-muted">{r.label}</span>
            <span>
              {r.count.toLocaleString()} <span className="text-fg-subtle">· {sent ? ((r.count / sent) * 100).toFixed(digits) : "0"}%</span>
            </span>
          </div>
        ))}
        <p className="mt-2 text-xs text-fg-subtle">{help}</p>
      </div>
    </div>
  );
}
