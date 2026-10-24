import type { Types } from "mongoose";
import { DailyStat } from "@/lib/db/models/DailyStat";

export type Totals = {
  total: number;
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  failed: number;
  opened: number;
  clicked: number;
  received: number;
  bouncePermanent: number;
  bounceTransient: number;
  bounceUndetermined: number;
};

const FIELDS = ["total", "sent", "delivered", "bounced", "bouncePermanent", "bounceTransient", "complained", "opened", "clicked", "failed", "received"] as const;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function sumStage() {
  return Object.fromEntries(FIELDS.map((f) => [f, { $sum: `$${f}` }]));
}

function finalize(row: Partial<Record<(typeof FIELDS)[number], number>> | undefined): Totals {
  const r = Object.fromEntries(FIELDS.map((f) => [f, row?.[f] ?? 0])) as Record<(typeof FIELDS)[number], number>;
  return { ...r, bounceUndetermined: Math.max(0, r.bounced - r.bouncePermanent - r.bounceTransient) };
}

/** Totals for a team over [from, to) from the daily rollup. `domain` filters by sender domain. */
export async function emailTotals(workspaceId: Types.ObjectId | null, from: Date, to: Date, opts: { domain?: string } = {}): Promise<Totals> {
  // Every day whose start lies in [from, to): from's day … the day containing to − 1ms.
  const match: Record<string, unknown> = { day: { $gte: dayKey(from), $lte: dayKey(new Date(to.getTime() - 1)) } };
  if (workspaceId) match.workspaceId = workspaceId;
  if (opts.domain) match.domain = opts.domain;
  const [row] = await DailyStat.aggregate([{ $match: match }, { $group: { _id: null, ...sumStage() } }]);
  return finalize(row);
}

export type Bucket = { key: string; label: string; sub: string } & Totals;

/**
 * Time-bucketed counts starting at `from` (UTC midnight) for `days` days.
 * granularity "week" groups into 7-day buckets (3-month view).
 */
export async function emailSeries(workspaceId: Types.ObjectId | null, from: Date, days: number, granularity: "day" | "week" = "day", opts: { domain?: string } = {}): Promise<Bucket[]> {
  const to = new Date(from.getTime() + days * 86_400_000);
  const match: Record<string, unknown> = { day: { $gte: dayKey(from), $lt: dayKey(to) } };
  if (workspaceId) match.workspaceId = workspaceId;
  if (opts.domain) match.domain = opts.domain;
  const rows: ({ _id: string } & Partial<Totals>)[] = await DailyStat.aggregate([{ $match: match }, { $group: { _id: "$day", ...sumStage() } }]);
  const byDay = new Map(rows.map((r) => [r._id, r]));

  const out: Bucket[] = [];
  const step = granularity === "week" ? 7 : 1;
  for (let i = 0; i < days; i += step) {
    const start = new Date(from.getTime() + i * 86_400_000);
    const acc: Partial<Record<(typeof FIELDS)[number], number>> = {};
    for (let d = 0; d < step && i + d < days; d++) {
      const r = byDay.get(dayKey(new Date(start.getTime() + d * 86_400_000)));
      if (!r) continue;
      for (const f of FIELDS) acc[f] = (acc[f] ?? 0) + ((r as unknown as Record<string, number>)[f] ?? 0);
    }
    out.push({
      key: dayKey(start),
      label:
        granularity === "week"
          ? start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
          : days <= 7
            ? start.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
            : start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      sub:
        granularity === "week"
          ? `Week of ${start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`
          : start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }),
      ...finalize(acc),
    });
  }
  return out;
}

/** UTC midnight `days-1` days ago - the first bucket of a `days`-long window ending today. */
export function utcWindowStart(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d;
}

export function rate(n: number, d: number): number {
  return d > 0 ? (n / d) * 100 : 0;
}
