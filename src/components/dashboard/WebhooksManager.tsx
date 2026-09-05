"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createWebhookAction,
  toggleWebhookAction,
  deleteWebhookAction,
  type ActionState,
} from "@/app/(app)/actions";

export type WebhookView = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
};

const initial: ActionState = { ok: false };

export function WebhooksManager({
  webhooks,
  allEvents,
}: {
  webhooks: WebhookView[];
  allEvents: readonly string[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [state, action, pending] = useActionState(createWebhookAction, initial);
  const [, start] = useTransition();

  useEffect(() => {
    if (state.ok) {
      setCreating(false);
      router.refresh();
    }
  }, [state, router]);

  function toggle(id: string) {
    start(async () => {
      await toggleWebhookAction(id);
      router.refresh();
    });
  }
  function remove(id: string) {
    if (!confirm("Delete this webhook endpoint?")) return;
    start(async () => {
      await deleteWebhookAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setCreating((c) => !c)}>
          {creating ? "Cancel" : "Add endpoint"}
        </button>
      </div>

      {creating && (
        <form action={action} className="card p-5 mb-4 space-y-4">
          <div>
            <label className="label">Endpoint URL</label>
            <input
              name="url"
              type="url"
              className="input"
              placeholder="https://api.yourapp.com/webhooks/nanosend"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Events (none selected = all)</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {allEvents.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm text-fg-muted cursor-pointer">
                  <input type="checkbox" name="events" value={ev} className="accent-[var(--accent)]" />
                  <code className="mono">{ev}</code>
                </label>
              ))}
            </div>
          </div>
          {state.error && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {state.error}
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Adding…" : "Add endpoint"}
            </button>
          </div>
        </form>
      )}

      {webhooks.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <p className="text-fg-muted">No webhook endpoints yet.</p>
          <p className="text-sm text-fg-subtle mt-1">
            Add one to receive real-time delivery, bounce, and complaint events.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <div key={w.id} className="card p-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mono text-sm break-all">{w.url}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(w.events.length ? w.events : ["all events"]).map((e) => (
                    <span
                      key={e}
                      className="badge"
                      style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="btn btn-secondary" onClick={() => toggle(w.id)}>
                  {w.enabled ? "Disable" : "Enable"}
                </button>
                <button className="btn btn-danger" onClick={() => remove(w.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
