/** "3m ago", "6mo ago" - compact relative time used across tables. */
export function timeAgo(input: string | Date | number | null | undefined): string {
  if (!input) return "-";
  const t = new Date(input).getTime();
  if (Number.isNaN(t)) return "-";
  const s = Math.round((Date.now() - t) / 1000);
  const future = s < 0;
  const a = Math.abs(s);
  const fmt = (n: number, u: string) => (future ? `in ${n}${u}` : `${n}${u} ago`);
  if (a < 45) return future ? "in a moment" : "just now";
  if (a < 3600) return fmt(Math.round(a / 60), "m");
  if (a < 86_400) return fmt(Math.round(a / 3600), "h");
  if (a < 30 * 86_400) return fmt(Math.round(a / 86_400), "d");
  if (a < 365 * 86_400) return fmt(Math.round(a / (30 * 86_400)), "mo");
  return fmt(Math.round(a / (365 * 86_400)), "y");
}

export function pct(n: number, d: number, digits = 1): string {
  if (!d) return "0%";
  return `${((n / d) * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
}

export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
