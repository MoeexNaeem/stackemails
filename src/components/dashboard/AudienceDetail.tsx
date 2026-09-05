"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addContactAction,
  deleteContactAction,
  sendBroadcastAction,
  type ActionState,
} from "@/app/(app)/actions";

export type ContactView = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  unsubscribed: boolean;
  createdAt: string;
};

const initial: ActionState = { ok: false };

export function AudienceDetail({
  audienceId,
  contacts,
  defaultFrom,
}: {
  audienceId: string;
  contacts: ContactView[];
  defaultFrom: string;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  const [addState, addAction, adding] = useActionState(addContactAction, initial);
  const addRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (addState.ok) {
      addRef.current?.reset();
      router.refresh();
    }
  }, [addState, router]);

  const [bcState, bcAction, bcPending] = useActionState(sendBroadcastAction, initial);
  const [showBroadcast, setShowBroadcast] = useState(false);
  useEffect(() => {
    if (bcState.ok && !bcState.error) {
      setShowBroadcast(false);
      router.refresh();
    }
  }, [bcState, router]);

  function removeContact(id: string) {
    start(async () => {
      await deleteContactAction(id, audienceId);
      router.refresh();
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      {/* Contacts */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Contacts ({contacts.length})</h2>
          <button className="btn btn-primary" onClick={() => setShowBroadcast((s) => !s)}>
            {showBroadcast ? "Close" : "Send broadcast"}
          </button>
        </div>

        {showBroadcast && (
          <form action={bcAction} className="p-5 border-b border-border space-y-3 bg-bg-elevated/40">
            <input type="hidden" name="audienceId" value={audienceId} />
            <div>
              <label className="label">From</label>
              <input name="from" className="input" defaultValue={defaultFrom} required />
            </div>
            <div>
              <label className="label">Subject</label>
              <input name="subject" className="input" placeholder="Our October newsletter" required />
            </div>
            <div>
              <label className="label">HTML body</label>
              <textarea
                name="html"
                className="input font-mono text-xs"
                rows={4}
                defaultValue={"<h1>Hello!</h1>\n<p>Here's what's new this month.</p>"}
                required
              />
            </div>
            {bcState.error && (
              <p className="text-sm" style={{ color: "var(--danger)" }}>
                {bcState.error}
              </p>
            )}
            <button type="submit" className="btn btn-primary w-full" disabled={bcPending}>
              {bcPending ? "Queuing…" : `Send to ${contacts.filter((c) => !c.unsubscribed).length} contacts`}
            </button>
          </form>
        )}

        {contacts.length === 0 ? (
          <p className="px-5 py-12 text-center text-fg-muted">No contacts yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{c.email}</td>
                  <td className="px-5 py-3 text-fg-muted">
                    {[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      className="btn btn-ghost !px-2 !py-1 text-xs"
                      onClick={() => removeContact(c.id)}
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

      {/* Add contact */}
      <div className="card p-5 h-fit">
        <h2 className="font-semibold mb-3">Add contact</h2>
        <form ref={addRef} action={addAction} className="space-y-3">
          <input type="hidden" name="audienceId" value={audienceId} />
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" placeholder="person@example.com" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">First name</label>
              <input name="first_name" className="input" placeholder="Ada" />
            </div>
            <div>
              <label className="label">Last name</label>
              <input name="last_name" className="input" placeholder="Lovelace" />
            </div>
          </div>
          {addState.error && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {addState.error}
            </p>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={adding}>
            {adding ? "Adding…" : "Add contact"}
          </button>
        </form>
      </div>
    </div>
  );
}
