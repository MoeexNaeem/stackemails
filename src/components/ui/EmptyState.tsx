/** Centered empty state with a glossy icon tile (Resend-style), title, copy and actions. */
export function EmptyState({
  icon = "M4 6h16v12H4V6zm0 0l8 6 8-6",
  title,
  description,
  children,
}: {
  icon?: string;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden px-6 py-16 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: "radial-gradient(420px circle at 50% 0%, color-mix(in srgb, var(--violet) 10%, transparent), transparent 70%)" }}
      />
      <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: "linear-gradient(145deg, var(--bg-hover), var(--bg-elevated))",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 1px 0 rgba(255,255,255,.06) inset, 0 16px 30px -16px rgba(0,0,0,.7)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-fg-muted">
          <path d={icon} />
        </svg>
      </div>
      <p className="relative font-medium text-fg">{title}</p>
      {description && <p className="relative mx-auto mt-1.5 max-w-sm text-sm text-fg-subtle">{description}</p>}
      {children && <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
