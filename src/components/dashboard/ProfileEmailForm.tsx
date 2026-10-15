"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileEmailAction, type ActionState } from "@/app/(app)/actions";

const initial: ActionState = { ok: false };

export function ProfileEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateProfileEmailAction, initial);
  return (
    <div className="card p-5">
      <h2 className="font-semibold">Your email</h2>
      <form
        action={action}
        onSubmit={() => setTimeout(() => router.refresh(), 600)}
        className="mt-3 max-w-md"
      >
        <label className="label">Email address</label>
        <input name="email" type="email" className="input" defaultValue={email} />
        <div className="flex items-center gap-3 mt-3">
          <button className="btn btn-secondary" disabled={pending}>{pending ? "Saving…" : "Update email"}</button>
          {state.ok && <span className="text-sm" style={{ color: "var(--success)" }}>Updated.</span>}
          {state.error && <span className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
