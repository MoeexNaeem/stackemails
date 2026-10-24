/**
 * Stack Emails monogram: a geometric "S" and "E" joined by one lime stroke
 * that runs from the S's spine into the E's middle bar.
 * `tone="ink"` uses the public-site tile (lifted in dark mode via --m-logo-tile);
 * the default follows the dashboard theme via --logo-bg.
 */
export const LOGO_PATHS = {
  s: "M15 9.5H10a3.25 3.25 0 0 0 0 6.5h2a3.25 3.25 0 0 1 0 6.5H6.5",
  e: "M25.5 9.5H19v13h6.5",
  link: "M10 16h14",
};

export function LogoMark({ size = 28, tone = "theme" }: { size?: number; tone?: "theme" | "ink" }) {
  const bg = tone === "ink" ? "var(--m-logo-tile, #111214)" : "var(--logo-bg)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden style={{ display: "block", flexShrink: 0 }}>
      <rect width="32" height="32" rx="8.5" fill={bg} />
      <g strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={LOGO_PATHS.s} stroke="#fafafa" />
        <path d={LOGO_PATHS.e} stroke="#fafafa" />
        <path d={LOGO_PATHS.link} stroke="#c6f04f" />
      </g>
    </svg>
  );
}

export function Logo({
  size = 28,
  withText = true,
  tone = "theme",
}: {
  size?: number;
  withText?: boolean;
  tone?: "theme" | "ink";
}) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <LogoMark size={size} tone={tone} />
      {withText && (
        <span className="text-[17px] font-semibold tracking-[-0.02em]" style={{ color: tone === "ink" ? "var(--m-head, #15171a)" : undefined }}>
          Stack Emails
        </span>
      )}
    </span>
  );
}
