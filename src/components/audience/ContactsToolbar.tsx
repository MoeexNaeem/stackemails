"use client";

import { useActionState, useEffect, useState } from "react";
import { Modal, FormNote } from "@/components/ui/Modal";
import { createContactAction, importContactsAction, type AudienceState } from "@/app/(app)/audience-actions";

type Seg = { id: string; name: string };
type Prop = { key: string; label: string; type: string };
const initial: AudienceState = { ok: false };

export function SegmentPicker({ segments, selected = [] }: { segments: Seg[]; selected?: string[] }) {
  if (!segments.length) return <p className="text-xs text-fg-subtle">No segments yet. Create one under Segments.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {segments.map((s) => (
        <label key={s.id} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border-strong px-3 py-1 text-xs has-[:checked]:border-[var(--violet)] has-[:checked]:text-fg text-fg-muted">
          <input type="checkbox" name="segmentIds" value={s.id} defaultChecked={selected.includes(s.id)} className="sr-only" />
          {s.name}
        </label>
      ))}
    </div>
  );
}

export function ContactsToolbar({ segments, properties }: { segments: Seg[]; properties: Prop[] }) {
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [addState, add, addPending] = useActionState(createContactAction, initial);
  const [impState, imp, impPending] = useActionState(importContactsAction, initial);

  useEffect(() => {
    if (addState.ok) {
      const t = setTimeout(() => setAdding(false), 700);
      return () => clearTimeout(t);
    }
  }, [addState]);

  return (
    <div className="flex items-center gap-2">
      <button className="btn btn-secondary" onClick={() => setImporting(true)}>Import contacts</button>
      <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add contacts</button>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add contact" description="Contacts are shared across your team. Adding an existing email merges the details.">
        <form action={add} className="space-y-4">
          <div>
            <label className="label" htmlFor="c-email">Email</label>
            <input id="c-email" name="email" type="email" className="input" placeholder="jane@example.com" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="c-first">First name</label>
              <input id="c-first" name="firstName" className="input" maxLength={100} />
            </div>
            <div>
              <label className="label" htmlFor="c-last">Last name</label>
              <input id="c-last" name="lastName" className="input" maxLength={100} />
            </div>
          </div>
          {properties.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {properties.map((p) => (
                <div key={p.key}>
                  <label className="label" htmlFor={`p-${p.key}`}>{p.label}</label>
                  {p.type === "boolean" ? (
                    <select id={`p-${p.key}`} name={`prop_${p.key}`} className="input" defaultValue="">
                      <option value="">None</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <input id={`p-${p.key}`} name={`prop_${p.key}`} className="input" type={p.type === "number" ? "number" : p.type === "date" ? "date" : "text"} />
                  )}
                </div>
              ))}
            </div>
          )}
          <div>
            <span className="label">Segments</span>
            <SegmentPicker segments={segments} />
          </div>
          <label className="flex items-center gap-2 text-sm text-fg-muted">
            <input type="checkbox" name="unsubscribed" /> Mark as unsubscribed
          </label>
          <FormNote state={addState} />
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={addPending}>{addPending ? "Adding…" : "Add contact"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={importing} onClose={() => setImporting(false)} title="Import contacts" description="Upload a CSV with an email column. first_name, last_name, unsubscribed and any property keys are mapped automatically.">
        <form action={imp} className="space-y-4">
          <label className="block rounded-2xl border border-dashed border-border-strong p-6 text-center cursor-pointer hover:bg-bg-hover">
            <input type="file" name="file" accept=".csv,text/csv" className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-full file:border-0 file:bg-bg-hover file:px-3 file:py-1.5 file:text-fg" />
            <span className="mt-2 block text-xs text-fg-subtle">CSV up to 10 MB · up to 50,000 rows</span>
          </label>
          <div>
            <label className="label" htmlFor="pasted">…or paste email addresses</label>
            <textarea id="pasted" name="pasted" className="input" rows={3} placeholder="ada@example.com, grace@example.com" />
          </div>
          <div>
            <span className="label">Add imported contacts to segments</span>
            <SegmentPicker segments={segments} />
          </div>
          <a
            className="inline-block text-xs text-accent hover:underline"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent("email,first_name,last_name" + properties.map((p) => "," + p.key).join("") + "\nada@example.com,Ada,Lovelace\n")}`}
            download="contacts-template.csv"
          >
            Download CSV template
          </a>
          <FormNote state={impState} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setImporting(false)}>Close</button>
            <button className="btn btn-primary" disabled={impPending}>{impPending ? "Importing…" : "Import"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
