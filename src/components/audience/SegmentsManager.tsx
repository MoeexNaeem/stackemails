"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormNote } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { createSegmentAction, deleteSegmentAction, renameSegmentAction, type AudienceState } from "@/app/(app)/audience-actions";
import { timeAgo } from "@/lib/format";
import { confirmDialog } from "@/components/ui/Confirm";

type Row = { id: string; name: string; description: string; contacts: number; unsubscribed: number; createdAt: string };
const initial: AudienceState = { ok: false };

export function SegmentsManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createSegmentAction, initial);
  const [, start] = useTransition();

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Create segment</button>
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No segments yet" description="Segments group contacts so you can target broadcasts and automations." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contacts</th>
                <th>Unsubscribed</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link href={`/audience?segment=${r.id}`} className="hover:text-accent font-medium">{r.name}</Link>
                    {r.description && <p className="text-xs text-fg-subtle">{r.description}</p>}
                  </td>
                  <td>{r.contacts.toLocaleString()}</td>
                  <td className="text-fg-muted">{r.unsubscribed.toLocaleString()}</td>
                  <td className="text-fg-subtle">{timeAgo(r.createdAt)}</td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const name = prompt("Rename segment", r.name);
                        if (!name || name === r.name) return;
                        start(async () => {
                          await renameSegmentAction(r.id, name);
                          router.refresh();
                        });
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="btn btn-danger btn-sm ml-1"
                      onClick={async () => {
                        if (!(await confirmDialog(`Delete segment "${r.name}"? Contacts are kept; only the grouping is removed.`))) return;
                        start(async () => {
                          await deleteSegmentAction(r.id);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Create segment">
        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="seg-name">Name</label>
            <input id="seg-name" name="name" className="input" placeholder="Newsletter subscribers" maxLength={80} required />
          </div>
          <div>
            <label className="label" htmlFor="seg-desc">Description <span className="text-fg-subtle">(optional)</span></label>
            <input id="seg-desc" name="description" className="input" maxLength={300} />
          </div>
          <FormNote state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Creating…" : "Create segment"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
