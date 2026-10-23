/**
 * Stack Emails mark: three stacked envelopes, the front one in lime.
 * `tone="ink"` uses the public-site tile (near-black; lifted in dark mode via --m-logo-tile);
 * the default follows the dashboard theme via --logo-bg.
 */
export function LogoMark({ size = 28, tone = "theme" }: { size?: number; tone?: "theme" | "ink" }) {
  const bg = tone === "ink" ? "var(--m-logo-tile, #15171a)" : "var(--logo-bg)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden style={{ display: "block", flexShrink: 0 }}>
      <rect width="32" height="32" rx="9" fill={bg} />
      <rect x="10" y="6.5" width="12" height="8" rx="2" fill="#b77fe0" opacity="0.55" />
      <rect x="8" y="9.5" width="16" height="10" rx="2.5" fill="#b77fe0" opacity="0.85" />
      <rect x="6" y="13" width="20" height="13" rx="3" fill="#c6f04f" />
      <path d="M7.2 14.6 16 20.4l8.8-5.8" stroke="#15171a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
