import { Sparkline } from "@/components/ui/Charts";

/** Percentage change between two periods, or null when there's no baseline. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/**
 * KPI tile (Monera): small label, large light value, coloured delta pill.
 * `invert` flips the colour logic for metrics where up is bad (bounces).
 */
export function StatCard({
  label,
  value,
  delta,
  invert = false,
  hint,
  trend,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invert?: boolean;
  hint?: string;
  trend?: number[];
}) {
  let cls = "delta-flat";
  let text = "-";
  if (delta !== undefined && delta !== null) {
    const good = invert ? delta < 0 : delta > 0;
    cls = Math.abs(delta) < 0.05 ? "delta-flat" : good ? "delta-up" : "delta-down";
    text = `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
  } else if (delta === null) {
    cls = "delta-up";
    text = "new";
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] text-fg-muted">{label}</p>
        {trend && <Sparkline values={trend} />}
      </div>
      <div className="mt-2 flex items-baseline gap-2.5">
        <p className="text-[26px] font-normal tracking-tight leading-none">{value}</p>
        {delta !== undefined && <span className={`delta ${cls}`}>{text}</span>}
      </div>
      {hint && <p className="mt-2 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
