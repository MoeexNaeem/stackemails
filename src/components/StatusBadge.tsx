const STYLES: Record<string, { color: string; label?: string }> = {
  queued: { color: "var(--info)", label: "Queued" },
  scheduled: { color: "var(--info)", label: "Scheduled" },
  sent: { color: "var(--violet)", label: "Sent" },
  delivered: { color: "var(--success)", label: "Delivered" },
  delivery_delayed: { color: "var(--warning)", label: "Delayed" },
  bounced: { color: "var(--danger)", label: "Bounced" },
  complained: { color: "var(--warning)", label: "Complained" },
  failed: { color: "var(--danger)", label: "Failed" },
  canceled: { color: "var(--fg-subtle)", label: "Canceled" },
  verified: { color: "var(--success)", label: "Verified" },
  pending: { color: "var(--warning)", label: "Pending" },
  live: { color: "var(--success)" },
  test: { color: "var(--fg-subtle)" },
  draft: { color: "var(--fg-subtle)", label: "Draft" },
  sending: { color: "var(--info)", label: "Sending" },
  active: { color: "var(--success)", label: "Active" },
  paused: { color: "var(--warning)", label: "Paused" },
  open: { color: "var(--info)", label: "Open" },
  resolved: { color: "var(--success)", label: "Resolved" },
  closed: { color: "var(--fg-subtle)", label: "Closed" },
};

/** Monera-style status pill. */
export function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? { color: "var(--fg-subtle)" };
  return (
    <span
      className="badge"
      style={{
        color: s.color,
        background: `color-mix(in srgb, ${s.color} 14%, transparent)`,
      }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label ?? status}
    </span>
  );
}
