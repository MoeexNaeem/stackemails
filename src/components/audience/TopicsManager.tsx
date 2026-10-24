"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormNote } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { deleteTopicAction, saveTopicAction, type AudienceState } from "@/app/(app)/audience-actions";
import { confirmDialog } from "@/components/ui/Confirm";

type Row = { id: string; name: string; description: string; defaultSubscribed: boolean; visibility: string; optedIn: number; optedOut: number };
const initial: AudienceState = { ok: false };

export function TopicsManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null | "new">(null);
  const [state, action, pending] = useActionState(saveTopicAction, initial);
  const [, start] = useTransition();
  const current = editing && editing !== "new" ? editing : null;

  useEffect(() => {
    if (state.ok) setEditing(null);
  }, [state]);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm text-fg-muted max-w-xl">Topics let recipients choose which kinds of email they get on your hosted preference page. Target a topic when sending a broadcast.</p>
        <button className="btn btn-primary" onClick={() => setEditing("new")}>+ Create topic</button>
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="M7 7h10M7 12h10M7 17h6" title="No topics yet" description="Create topics like “Product updates” or “Weekly digest” so subscribers can opt in or out of each." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Default</th>
                <th>Visibility</th>
                <th>Opted in / out</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <p className="font-medium">{r.name}</p>
                    {r.description && <p className="text-xs text-fg-subtle">{r.description}</p>}
                  </td>
                  <td className="text-fg-muted">{r.defaultSubscribed ? "Opt-in (subscribed)" : "Opt-out (unsubscribed)"}</td>
                  <td className="capitalize text-fg-muted">{r.visibility}</td>
                  <td className="text-fg-muted">{r.optedIn} / {r.optedOut}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>Edit</button>
                    <button
                      className="btn btn-danger btn-sm ml-1"
                      onClick={async () => {
                        if (!(await confirmDialog(`Delete topic "${r.name}"?`))) return;
                        start(async () => {
                          await deleteTopicAction(r.id);
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

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={current ? "Edit topic" : "Create topic"}>
        <form action={action} className="space-y-4" key={current?.id ?? "new"}>
          {current && <input type="hidden" name="id" value={current.id} />}
          <div>
            <label className="label" htmlFor="t-name">Name</label>
            <input id="t-name" name="name" className="input" defaultValue={current?.name} placeholder="Product updates" maxLength={80} required />
          </div>
          <div>
            <label className="label" htmlFor="t-desc">Description</label>
            <input id="t-desc" name="description" className="input" defaultValue={current?.description} placeholder="New features and improvements, about once a month" maxLength={300} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="t-def">Default subscription</label>
              <select id="t-def" name="defaultSubscription" className="input" defaultValue={current && !current.defaultSubscribed ? "opt_out" : "opt_in"}>
                <option value="opt_in">Opt-in: subscribed by default</option>
                <option value="opt_out">Opt-out: must opt in</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="t-vis">Visibility</label>
              <select id="t-vis" name="visibility" className="input" defaultValue={current?.visibility ?? "public"}>
                <option value="public">Public: on preference page</option>
                <option value="private">Private: hidden</option>
              </select>
            </div>
          </div>
          <FormNote state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save topic"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
