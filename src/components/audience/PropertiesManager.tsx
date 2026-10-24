"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal, FormNote } from "@/components/ui/Modal";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { createPropertyAction, deletePropertyAction, type AudienceState } from "@/app/(app)/audience-actions";
import { confirmDialog } from "@/components/ui/Confirm";

type Row = { id: string; key: string; label: string; type: string; fallback: string; createdAt: string };
const initial: AudienceState = { ok: false };

export function PropertiesManager({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createPropertyAction, initial);
  const [, start] = useTransition();

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <FilterBar
          fields={[
            {
              type: "select",
              name: "type",
              options: [
                { value: "", label: "All types" },
                { value: "string", label: "String" },
                { value: "number", label: "Number" },
                { value: "boolean", label: "Boolean" },
                { value: "date", label: "Date" },
              ],
            },
          ]}
        />
        <button className="btn btn-primary mb-4" onClick={() => setOpen(true)}>+ Add property</button>
      </div>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="M4 6h16M4 12h10M4 18h7" title="No properties yet" description="Properties store custom data on contacts (plan, city, company…) for personalising broadcasts with {{contact.key}}." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Key</th>
                <th>Type</th>
                <th>Fallback</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td className="mono text-xs text-fg-muted">{`{{contact.${r.key}}}`}</td>
                  <td className="capitalize text-fg-muted">{r.type}</td>
                  <td className="text-fg-subtle">{r.fallback || "-"}</td>
                  <td className="text-right">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={async () => {
                        if (!(await confirmDialog(`Delete property "${r.key}"? Its values are removed from every contact.`))) return;
                        start(async () => {
                          await deletePropertyAction(r.id);
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

      <Modal open={open} onClose={() => setOpen(false)} title="Add property" description="Use it in broadcasts as {{contact.key}}; the fallback is used when a contact has no value.">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="label">Label</label>
              <input id="label" name="label" className="input" placeholder="Company" maxLength={80} />
            </div>
            <div>
              <label className="label" htmlFor="key">Key</label>
              <input id="key" name="key" className="input mono" placeholder="company" pattern="[A-Za-z][A-Za-z0-9_ ]*" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="type">Type</label>
              <select id="type" name="type" className="input" defaultValue="string">
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="date">Date</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="fallback">Fallback value</label>
              <input id="fallback" name="fallback" className="input" placeholder="there" maxLength={200} />
            </div>
          </div>
          <FormNote state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={pending}>{pending ? "Adding…" : "Add property"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
