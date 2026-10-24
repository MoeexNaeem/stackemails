"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteWebhookAction, redeliverAction, sendTestWebhookAction, toggleWebhookAction } from "@/app/(app)/webhook-actions";
import { timeAgo } from "@/lib/format";
import { confirmDialog } from "@/components/ui/Confirm";

type Delivery = { id: string; eventId: string; eventType: string; status: string; attempts: number; responseStatus: number | null; responseBody: string; error: string; durationMs: number | null; nextRetryAt: string | null; createdAt: string; payload: string };
const STATUS: Record<string, string> = { success: "delivered", failed: "failed", retrying: "delivery_delayed", pending: "queued" };

export function WebhookDetail({ webhook, deliveries }: { webhook: { id: string; url: string; enabled: boolean; events: string[]; createdAt: string }; deliveries: Delivery[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(deliveries[0]?.id ?? null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string } | void>) =>
    start(async () => {
      const r = await fn();
      if (r) setNote({ ok: r.ok, text: r.error ?? r.message ?? "" });
      router.refresh();
    });
  const current = deliveries.find((d) => d.id === open);

  return (
    <div>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Webhook endpoint</p>
          <h1 className="mono mt-1 break-all text-lg">{webhook.url}</h1>
          <p className="mt-1 text-xs text-fg-subtle">{webhook.events.length ? webhook.events.join(", ") : "All events"} · added {timeAgo(webhook.createdAt)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {note && <span className="text-xs" style={{ color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</span>}
          <button className="btn btn-secondary" disabled={pending} onClick={() => run(() => sendTestWebhookAction(webhook.id))}>Send test event</button>
          <button className="btn btn-secondary" disabled={pending} onClick={() => run(() => toggleWebhookAction(webhook.id))}>{webhook.enabled ? "Disable" : "Enable"}</button>
          <button
            className="btn btn-danger"
            disabled={pending}
            onClick={async () => {
              if (!(await confirmDialog("Delete this endpoint?"))) return;
              start(async () => {
                await deleteWebhookAction(webhook.id);
                router.push("/webhooks");
              });
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="card"><EmptyState title="No deliveries yet" description="Send a test event, or trigger a real one by sending an email." /></div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="card overflow-hidden">
            <ul className="max-h-[640px] overflow-y-auto">
              {deliveries.map((d) => (
                <li key={d.id}>
                  <button onClick={() => setOpen(d.id)} className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-3 text-left hover:bg-bg-hover" style={{ background: open === d.id ? "var(--bg-hover)" : undefined }}>
                    <span className="min-w-0">
                      <span className="mono block truncate text-[13px]">{d.eventType}</span>
                      <span className="text-[11px] text-fg-subtle">{timeAgo(d.createdAt)} · attempt {d.attempts}</span>
                    </span>
                    <StatusBadge status={STATUS[d.status] ?? d.status} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {current && (
            <div className="card min-w-0 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="mono text-sm">{current.eventType}</p>
                  <p className="text-xs text-fg-subtle">{current.eventId} · {new Date(current.createdAt).toLocaleString()}</p>
                </div>
                <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run(() => redeliverAction(current.id))}>Resend</button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="eyebrow">Response</p><p className="mt-1 mono">{current.responseStatus ?? "-"}</p></div>
                <div><p className="eyebrow">Duration</p><p className="mt-1">{current.durationMs != null ? `${current.durationMs}ms` : "-"}</p></div>
                <div><p className="eyebrow">Next retry</p><p className="mt-1">{current.nextRetryAt ? timeAgo(current.nextRetryAt) : "-"}</p></div>
              </div>
              {current.error && <p className="rounded-xl px-3 py-2 text-sm" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}>{current.error}</p>}
              <div>
                <p className="eyebrow mb-1.5">Payload</p>
                <pre className="mono max-h-72 overflow-auto rounded-xl p-3 text-xs text-fg-muted" style={{ background: "var(--bg)" }}>{current.payload}</pre>
              </div>
              {current.responseBody && (
                <div>
                  <p className="eyebrow mb-1.5">Response body</p>
                  <pre className="mono max-h-48 overflow-auto rounded-xl p-3 text-xs text-fg-muted" style={{ background: "var(--bg)" }}>{current.responseBody}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
