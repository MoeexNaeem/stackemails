"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormNote } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { addSuppressionAction, removeSuppressionAction, type EmailsState } from "@/app/(app)/emails-actions";
import { timeAgo } from "@/lib/format";
import { confirmDialog } from "@/components/ui/Confirm";

const COLOR: Record<string, string> = { bounce: "var(--danger)", complaint: "var(--warning)", unsubscribe: "var(--fg-subtle)", manual: "var(--info)" };
const initial: EmailsState = { ok: false };

export function SuppressionsManager({ rows }: { rows: { id: string; email: string; reason: string; createdAt: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addSuppressionAction, initial);
  const [, start] = useTransition();
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <div>
      <div className="flex justify-end -mt-14 mb-4">
        <button className="btn btn-secondary" onClick={() => setOpen(true)}>+ Add addresses</button>
      </div>
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.7 5.7l12.6 12.6" title="No suppressed addresses" description="Hard-bounced and complaining recipients will appear here automatically." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Reason</th>
                <th>Added</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.email}</td>
                  <td>
                    <span className="badge capitalize" style={{ color: COLOR[r.reason], background: `color-mix(in srgb, ${COLOR[r.reason]} 14%, transparent)` }}>{r.reason}</span>
                  </td>
                  <td className="text-fg-subtle">{timeAgo(r.createdAt)}</td>
                  <td className="text-right">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        if (!(await confirmDialog(`Remove ${r.email} from suppressions? Future emails will be sent to it again.`))) return;
                        start(async () => {
                          await removeSuppressionAction(r.id);
                          router.refresh();
                        });
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Suppress addresses" description="Emails to these addresses will be skipped.">
        <form action={action} className="space-y-4">
          <textarea name="emails" className="input" rows={5} placeholder={"one@example.com\ntwo@example.com"} required />
          <FormNote state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Suppress"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
