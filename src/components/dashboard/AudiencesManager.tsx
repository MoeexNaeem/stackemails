"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAudienceAction, deleteAudienceAction, type ActionState } from "@/app/(app)/actions";

export type AudienceView = {
  id: string;
  name: string;
  contactCount: number;
  createdAt: string;
};

const initial: ActionState = { ok: false };

export function AudiencesManager({ audiences }: { audiences: AudienceView[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [state, action, pending] = useActionState(createAudienceAction, initial);
  const [, start] = useTransition();

  useEffect(() => {
    if (state.ok) {
      setCreating(false);
      router.refresh();
    }
  }, [state, router]);

  function remove(id: string, name: string) {
    if (!confirm(`Delete audience "${name}" and all its contacts?`)) return;
    start(async () => {
      await deleteAudienceAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn btn-primary" onClick={() => setCreating((c) => !c)}>
          {creating ? "Cancel" : "Create audience"}
        </button>
      </div>

      {creating && (
        <form action={action} className="card p-5 mb-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="label">Audience name</label>
            <input name="name" className="input" placeholder="Newsletter subscribers" required autoFocus />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Creating…" : "Create"}
          </button>
          {state.error && (
            <p className="w-full text-sm" style={{ color: "var(--danger)" }}>
              {state.error}
            </p>
          )}
        </form>
      )}

      {audiences.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <p className="text-fg-muted">No audiences yet.</p>
          <p className="text-sm text-fg-subtle mt-1">
            Create one to group contacts and send broadcasts.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {audiences.map((a) => (
            <div key={a.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <Link href={`/audiences/${a.id}`} className="font-medium hover:text-accent">
                  {a.name}
                </Link>
                <button
                  className="btn btn-ghost !px-2 !py-1 text-xs"
                  onClick={() => remove(a.id, a.name)}
                >
                  Delete
                </button>
              </div>
              <p className="text-sm text-fg-muted mt-2">
                {a.contactCount} {a.contactCount === 1 ? "contact" : "contacts"}
              </p>
              <Link
                href={`/audiences/${a.id}`}
                className="text-sm text-accent hover:underline mt-4"
              >
                Manage →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
