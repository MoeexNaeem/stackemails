"use client";

import { useActionState } from "react";
import { staffReplyAction, type OpsState } from "@/app/admin/ops-actions";

export function StaffReplyForm({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState<OpsState, FormData>(staffReplyAction, null);
  return (
    <form action={action} className="card space-y-3 p-5">
      <input type="hidden" name="id" value={id} />
      <label className="label" htmlFor="reply">Reply to customer</label>
      <textarea id="reply" name="body" rows={6} required className="input min-h-[140px]" placeholder="Write your reply. It's emailed to the customer and shown in their Help page." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          Then set status
          <select name="status" defaultValue={status === "open" ? "pending" : status} className="input !h-9 !w-auto !py-0">
            <option value="pending">Pending (waiting on customer)</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <button className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send reply"}</button>
      </div>
      {state && <p className={`text-sm ${state.ok ? "text-fg-muted" : ""}`} style={state.ok ? undefined : { color: "var(--danger)" }}>{state.ok ? state.message : state.error}</p>}
    </form>
  );
}
