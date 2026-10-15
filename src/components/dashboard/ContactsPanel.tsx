"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addContactAction, importContactsAction, type ActionState } from "@/app/(app)/actions";

export type FlatContact = {
  id: string;
  email: string;
  name: string;
  audience: string;
  unsubscribed: boolean;
};

const initial: ActionState = { ok: false };

export function ContactsPanel({
  contacts,
  audiences,
}: {
  contacts: FlatContact[];
  audiences: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<"none" | "add" | "import">("none");
  const [addState, add, adding] = useActionState(addContactAction, initial);
  const [impState, imp, importing] = useActionState(importContactsAction, initial);
  const addRef = useRef<HTMLFormElement>(null);
  const impRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (addState.ok) {
      addRef.current?.reset();
      setModal("none");
      router.refresh();
    }
  }, [addState, router]);
  useEffect(() => {
    if (impState.ok) {
      impRef.current?.reset();
      setModal("none");
      router.refresh();
    }
  }, [impState, router]);

  const noAudience = audiences.length === 0;

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <button className="btn btn-secondary" onClick={() => setModal("import")} disabled={noAudience}>
          Import contacts
        </button>
        <button className="btn btn-primary" onClick={() => setModal("add")} disabled={noAudience}>
          + Add contacts
        </button>
      </div>

      {noAudience && (
        <div className="card p-4 mb-4 text-sm text-fg-muted">
          Create an audience in the <b>Segments</b> tab first, then add contacts to it.
        </div>
      )}

      <div className="card overflow-hidden">
        {contacts.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-medium">No contacts yet</p>
            <p className="text-sm text-fg-subtle mt-1">Add contacts to manage, segment, and reach your audience.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Audience</th>
                <th className="px-5 py-3 font-medium">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-5 py-3">{c.email}</td>
                  <td className="px-5 py-3 text-fg-muted">{c.name || "—"}</td>
                  <td className="px-5 py-3 text-fg-muted">{c.audience}</td>
                  <td className="px-5 py-3">
                    <span className="badge" style={{ color: c.unsubscribed ? "var(--fg-subtle)" : "var(--success)", background: `color-mix(in srgb, ${c.unsubscribed ? "var(--fg-subtle)" : "var(--success)"} 14%, transparent)` }}>
                      {c.unsubscribed ? "Unsubscribed" : "Subscribed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add contact modal */}
      {modal === "add" && (
        <Modal title="Add contact" onClose={() => setModal("none")}>
          <form ref={addRef} action={add} className="space-y-3">
            <AudiencePicker audiences={audiences} />
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" placeholder="person@example.com" required autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">First name</label>
                <input name="first_name" className="input" />
              </div>
              <div>
                <label className="label">Last name</label>
                <input name="last_name" className="input" />
              </div>
            </div>
            {addState.error && <p className="text-sm" style={{ color: "var(--danger)" }}>{addState.error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn btn-secondary" onClick={() => setModal("none")}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={adding}>{adding ? "Adding…" : "Add"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Import modal */}
      {modal === "import" && (
        <Modal title="Import contacts" onClose={() => setModal("none")}>
          <form ref={impRef} action={imp} className="space-y-3">
            <AudiencePicker audiences={audiences} />
            <div>
              <label className="label">Emails</label>
              <textarea name="emails" className="input font-mono text-xs" rows={6} placeholder={"one@example.com\ntwo@example.com, three@example.com"} required autoFocus />
              <p className="text-xs text-fg-subtle mt-1">Separate with commas, spaces, or new lines.</p>
            </div>
            {impState.error && <p className="text-sm" style={{ color: impState.ok ? "var(--success)" : "var(--danger)" }}>{impState.error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn btn-secondary" onClick={() => setModal("none")}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={importing}>{importing ? "Importing…" : "Import"}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function AudiencePicker({ audiences }: { audiences: { id: string; name: string }[] }) {
  return (
    <div>
      <label className="label">Audience</label>
      <select name="audienceId" className="input" defaultValue={audiences[0]?.id} required>
        {audiences.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button className="btn btn-ghost px-2" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
