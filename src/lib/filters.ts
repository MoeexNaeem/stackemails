/** Shared helpers for URL-driven list filters (date ranges, search, pagination). */

export const RANGE_OPTIONS = [
  { value: "1d", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "15d", label: "Last 15 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["value"];

export function rangeDays(range: string | undefined, fallback: RangeKey = "15d"): number {
  const key = (RANGE_OPTIONS.find((o) => o.value === range)?.value ?? fallback) as RangeKey;
  return Number(key.replace("d", ""));
}

/** Start of the window for a range key, aligned to local midnight for multi-day windows. */
export function rangeSince(range: string | undefined, fallback: RangeKey = "15d"): Date {
  const days = rangeDays(range, fallback);
  const d = new Date();
  if (days === 1) return new Date(d.getTime() - 86_400_000);
  d.setDate(d.getDate() - (days - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Escape user input for use inside a Mongo $regex. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const PAGE_SIZE = 40;

export function pageOf(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

/** Quote a value for CSV. */
export function csvCell(v: unknown): string {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Neutralise spreadsheet formula injection (=, +, -, @, tab, CR at cell start).
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
}
