"use client";

import { useState, useTransition } from "react";
import { approveManualPaymentAction, rejectManualPaymentAction } from "@/app/admin/payment-actions";

export function PaymentReview({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  if (result?.ok) return <p className="mt-4 text-sm" style={{ color: "var(--success, #16a34a)" }}>{result.text}</p>;

  return (
    <div className="mt-4 space-y-3">
      {rejecting ? (
        <div className="flex flex-wrap items-center gap-2">
          <input className="input flex-1 min-w-[240px]" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Reason the customer will see, e.g. No transfer received yet" />
          <button className="btn btn-sm" style={{ background: "var(--danger)", color: "white" }} disabled={pending} onClick={() => start(async () => { const r = await rejectManualPaymentAction(id, reason); setResult({ ok: r.ok, text: r.message ?? r.error ?? "" }); })}>
            Reject payment
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setRejecting(false)}>Cancel</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn-primary btn-sm"
            disabled={pending}
            onClick={() => {
              if (!confirm("Approve only if the money is in your bank account. Activate the plan now?")) return;
              start(async () => { const r = await approveManualPaymentAction(id); setResult({ ok: r.ok, text: r.message ?? r.error ?? "" }); });
            }}
          >
            {pending ? "Working…" : "Money received: approve"}
          </button>
          <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => setRejecting(true)}>Reject…</button>
        </div>
      )}
      {result && !result.ok && <p className="text-sm" style={{ color: "var(--danger)" }}>{result.text}</p>}
    </div>
  );
}
