"use client";

import { useActionState } from "react";
import { updateTeamNameAction, type ActionState } from "@/app/(app)/actions";

const initial: ActionState = { ok: false };

export function TeamNameForm({ name, initialLetter }: { name: string; initialLetter: string }) {
  const [state, action, pending] = useActionState(updateTeamNameAction, initial);
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-4">Overview</h2>
      <div className="flex items-center gap-4 mb-5">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-lg text-xl font-bold"
          style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff" }}
        >
          {initialLetter}
        </span>
        <div>
          <button className="btn btn-secondary">Update image</button>
          <p className="text-xs text-fg-subtle mt-1">Maximum file size is 1MB.</p>
        </div>
      </div>
      <form action={action} className="max-w-md">
        <label className="label">Team name</label>
        <div className="flex items-center gap-3">
          <input name="name" className="input" defaultValue={name} />
          <button className="btn btn-secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          {state.ok && <span className="text-sm" style={{ color: "var(--success)" }}>Saved.</span>}
          {state.error && <span className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
