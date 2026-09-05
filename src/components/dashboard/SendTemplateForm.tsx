"use client";

import { useActionState } from "react";
import { sendWelcomeTemplateAction, type ActionState } from "@/app/(app)/actions";

const initial: ActionState = { ok: false };

export function SendTemplateForm({ defaultFrom }: { defaultFrom: string }) {
  const [state, action, pending] = useActionState(sendWelcomeTemplateAction, initial);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label className="label">From</label>
        <input name="from" className="input" defaultValue={defaultFrom} required />
      </div>
      <div>
        <label className="label">To</label>
        <input
          name="to"
          className="input"
          placeholder="recipient@example.com"
          defaultValue="new-user@example.com"
          required
        />
      </div>
      {state.error && (
        <p className="text-sm" style={{ color: "var(--danger)" }}>
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm" style={{ color: "var(--success)" }}>
          Rendered &amp; queued! See the Emails page.
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Render & send this template"}
      </button>
    </form>
  );
}
