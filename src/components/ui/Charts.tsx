"use client";

import { useId, useState } from "react";

export type BarDatum = { label: string; value: number; sub?: string };

/**
 * Monera-style pill bar chart: rounded violet bars with a soft glow, the
 * hovered (or peak) bar lit up with a floating tooltip.
 */
export function PillBarChart({
  data,
  height = 220,
  unit = "number",
  color = "var(--violet)",
}: {
  data: BarDatum[];
  height?: number;
  /** Serializable (server → client) value format. */
  unit?: "number" | "percent";
  color?: string;
}) {
  const format = (n: number) => (unit === "percent" ? `${n}%` : n.toLocaleString());
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? (data[peak]?.value > 0 ? peak : null);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;

  return (
    <div className="flex gap-3" style={{ height }}>
      <div className="flex flex-col justify-between text-[11px] text-fg-subtle pb-6 shrink-0 text-right w-8">
        {[...ticks].reverse().map((t) => (
          <span key={t}>{compact(t)}</span>
        ))}
      </div>
      <div className="relative flex-1">
        {/* gridlines */}
        <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
          {ticks.map((t) => (
            <div key={t} className="border-t border-dashed" style={{ borderColor: "color-mix(in srgb, var(--border-strong) 70%, transparent)" }} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-end gap-[3%] pb-6" onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(4, (d.value / top) * 100) : 0;
            const isActive = i === active;
            return (
              <div
                key={i}
                className="relative flex-1 h-full flex items-end justify-center cursor-default"
                onMouseEnter={() => setHover(i)}
              >
                <div
                  className="w-full max-w-[34px] rounded-full transition-all duration-300"
                  style={{
                    height: h > 0 ? `${h}%` : 6,
                    background: h > 0
                      ? isActive
                        ? `linear-gradient(180deg, color-mix(in srgb, ${color} 100%, white 25%), ${color})`
                        : `linear-gradient(180deg, color-mix(in srgb, ${color} 55%, transparent), color-mix(in srgb, ${color} 18%, transparent))`
                      : "color-mix(in srgb, var(--fg-subtle) 25%, transparent)",
                    boxShadow: isActive && h > 0 ? `0 0 24px color-mix(in srgb, ${color} 55%, transparent)` : undefined,
                  }}
                />
                {isActive && d.value > 0 && (
                  <div
                    className="absolute z-10 rounded-xl px-3 py-2 text-xs whitespace-nowrap pointer-events-none"
                    style={{
                      bottom: `calc(${h}% + 10px)`,
                      left: i > data.length * 0.6 ? "auto" : "60%",
                      right: i > data.length * 0.6 ? "60%" : "auto",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-strong)",
                      boxShadow: "0 12px 30px -12px rgba(0,0,0,.6)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-fg">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                      {format(d.value)}
                    </div>
                    <div className="mt-1 pt-1 border-t border-border text-fg-subtle">{d.sub ?? d.label}</div>
                  </div>
                )}
                <span className="absolute -bottom-6 text-[11px] text-fg-subtle truncate max-w-full">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export type DonutSlice = { label: string; value: number; color: string };

/** Donut with labelled callouts for the top slices (Monera "Expense Breakdown"). */
export function DonutChart({ slices, size = 200, centerLabel }: { slices: DonutSlice[]; size?: number; centerLabel?: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = 70;
  const stroke = 46;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 200 200" width={size} height={size} className="-rotate-90">
          <circle cx="100" cy="100" r={r} fill="none" stroke="var(--bg-hover)" strokeWidth={stroke} />
          {total > 0 &&
            slices.map((s, i) => {
              const len = (s.value / total) * c;
              const el = (
                <circle
                  key={s.label}
                  cx="100"
                  cy="100"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hover === i ? stroke + 6 : stroke}
                  strokeDasharray={`${Math.max(0, len - 1.5)} ${c}`}
                  strokeDashoffset={-offset}
                  style={{ transition: "stroke-width .2s" }}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                />
              );
              offset += len;
              return el;
            })}
          <circle cx="100" cy="100" r={r - stroke / 2 - 1} fill="var(--bg-card)" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hover !== null && total > 0 ? (
            <>
              <span className="text-xl font-medium">{Math.round((slices[hover].value / total) * 100)}%</span>
              <span className="text-[11px] text-fg-subtle">{slices[hover].label}</span>
            </>
          ) : (
            <>
              <span className="text-xl font-medium">{total.toLocaleString()}</span>
              <span className="text-[11px] text-fg-subtle">{centerLabel ?? "total"}</span>
            </>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
        {slices.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: s.color }} />
            {s.label}
            <span className="text-fg-subtle">{total > 0 ? `${Math.round((s.value / total) * 100)}%` : "0%"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Smooth area chart for time series (Metrics). */
export function AreaChart({
  data,
  height = 260,
  color = "var(--violet)",
  unit = "number",
  yMax,
}: {
  data: BarDatum[];
  height?: number;
  color?: string;
  /** Serializable (server → client) value format. */
  unit?: "number" | "percent";
  yMax?: number;
}) {
  const format = (n: number) => (unit === "percent" ? `${n}%` : n.toLocaleString());
  const [hover, setHover] = useState<number | null>(null);
  const W = 1000;
  const H = 300;
  const pad = 12;
  const max = yMax ?? Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => [pad + i * step, pad + (H - pad * 2) * (1 - d.value / max)] as const);
  const line = smoothPath(pts);
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${H - pad} L${pts[0][0]},${H - pad} Z` : "";
  const id = `g${useId().replace(/:/g, "")}`;

  return (
    <div className="relative" style={{ height }} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[calc(100%-22px)]">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad} x2={W - pad} y1={pad + (H - pad * 2) * f} y2={pad + (H - pad * 2) * f} stroke="var(--border)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
        ))}
        {area && <path d={area} fill={`url(#${id})`} />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />}
        {hover !== null && pts[hover] && (
          <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad} y2={H - pad} stroke="var(--border-strong)" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="absolute inset-0 bottom-[22px] flex">
        {data.map((d, i) => (
          <div key={i} className="flex-1 relative" onMouseEnter={() => setHover(i)}>
            {hover === i && (
              <div
                className="absolute top-2 z-10 rounded-xl px-3 py-2 text-xs whitespace-nowrap pointer-events-none"
                style={{ left: i > data.length / 2 ? "auto" : "50%", right: i > data.length / 2 ? "50%" : "auto", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}
              >
                <div className="font-medium">{format(d.value)}</div>
                <div className="text-fg-subtle">{d.sub ?? d.label}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="absolute bottom-0 inset-x-0 flex justify-between text-[11px] text-fg-subtle">
        {data.map((d, i) => (
          <span key={i} className={i % Math.ceil(data.length / 8) === 0 || i === data.length - 1 ? "" : "invisible"}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Tiny inline trend line for KPI cards. */
export function Sparkline({ values, color = "var(--violet)", width = 96, height = 28 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * width, height - 2 - (v / max) * (height - 4)] as const);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

function niceTicks(max: number): number[] {
  const steps = 4;
  const raw = max / steps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  const step = Math.max(1, nice * mag);
  return Array.from({ length: steps + 1 }, (_, i) => Math.round(i * step));
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(n);
}
