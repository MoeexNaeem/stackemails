"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormNote } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { CopyButton } from "@/components/CopyButton";
import { createEventAction, deleteEventAction, sendTestEventAction, type AutoState } from "@/app/(app)/automation-actions";
import { timeAgo } from "@/lib/format";
import { confirmDialog } from "@/components/ui/Confirm";

type Row = { id: string; name: string; description: string; received: number; lastReceivedAt: string | null; automations: number };
const initial: AutoState = { ok: false };

export function EventsManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [createState, create, createPending] = useActionState(createEventAction, initial);
  const [testState, test, testPending] = useActionState(sendTestEventAction, initial);
  const [, start] = useTransition();

  useEffect(() => {
    if (createState.ok) setCreating(false);
  }, [createState]);

  const snippet = (name: string) => `curl -X POST https://stackemails.com/v1/events \\
  -H "Authorization: Bearer se_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"${name}","email":"jane@example.com","data":{"plan":"pro"}}'`;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-fg-muted">Events are signals from your app (like <code className="mono text-xs">user.signed_up</code>) that trigger automations. Send them with <code className="mono text-xs">POST /v1/events</code>.</p>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Add event</button>
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="M13 10V3L4 14h7v7l9-11h-7z" title="No events yet" description="Create events to trigger automations." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Used by</th>
                <th>Received</th>
                <th>Last received</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <code className="mono text-[13px]">{r.name}</code>
                    {r.description && <p className="text-xs text-fg-subtle">{r.description}</p>}
                  </td>
                  <td className="text-fg-muted">{r.automations} automation{r.automations === 1 ? "" : "s"}</td>
                  <td>{r.received.toLocaleString()}</td>
                  <td className="text-fg-subtle">{timeAgo(r.lastReceivedAt)}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => setTesting(r.name)}>Send test</button>
                    <button
                      className="btn btn-danger btn-sm ml-1"
                      onClick={async () => {
                        if (!(await confirmDialog(`Delete event "${r.name}"? Automations using it will stop triggering.`))) return;
                        start(async () => {
                          await deleteEventAction(r.id);
                          router.refresh();
                        });
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Add event">
        <form action={create} className="space-y-4">
          <div>
            <label className="label" htmlFor="ev-name">Name</label>
            <input id="ev-name" name="name" className="input mono" placeholder="user.signed_up" required maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="ev-desc">Description <span className="text-fg-subtle">(optional)</span></label>
            <input id="ev-desc" name="description" className="input" maxLength={300} />
          </div>
          <FormNote state={createState} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={createPending}>{createPending ? "Adding…" : "Add event"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={testing !== null} onClose={() => setTesting(null)} title={`Send test event`} description="Runs every active automation triggered by this event for the contact." width="max-w-xl">
        {testing && (
          <form action={test} className="space-y-4">
            <input type="hidden" name="name" value={testing} />
            <div>
              <label className="label" htmlFor="ev-email">Contact email</label>
              <input id="ev-email" name="email" type="email" className="input" placeholder="you@company.com" required />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between"><span className="label !mb-0">From your code</span><CopyButton value={snippet(testing)} className="!px-2 !py-1" /></div>
              <pre className="mono overflow-x-auto rounded-xl p-3 text-xs text-fg-muted" style={{ background: "var(--bg)" }}>{snippet(testing)}</pre>
            </div>
            <FormNote state={testState} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setTesting(null)}>Close</button>
              <button className="btn btn-primary" disabled={testPending}>{testPending ? "Sending…" : "Send test event"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
