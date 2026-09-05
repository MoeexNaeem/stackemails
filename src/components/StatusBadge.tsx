const STYLES: Record<string, { color: string; label?: string }> = {
  queued: { color: "var(--info)" },
  sent: { color: "var(--accent)" },
  delivered: { color: "var(--success)" },
  bounced: { color: "var(--danger)" },
  complained: { color: "var(--warning)" },
  failed: { color: "var(--danger)" },
  verified: { color: "var(--success)" },
  pending: { color: "var(--warning)" },
  live: { color: "var(--success)" },
  test: { color: "var(--fg-subtle)" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? { color: "var(--fg-subtle)" };
  return (
    <span
      className="badge"
      style={{
        color: s.color,
        background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${s.color} 30%, transparent)`,
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: s.color }}
      />
      {s.label ?? status}
    </span>
  );
}
