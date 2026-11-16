"use client";

import { useState, useTransition } from "react";
import { approveAccountAction, suspendAccountAction } from "@/app/admin/review-actions";

export function AccountReviewButtons({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  if (result?.ok) return <span className="text-sm text-fg-muted">{result.text}</span>;
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex gap-2">
        <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => start(async () => { const r = await approveAccountAction(userId); setResult({ ok: r.ok, text: r.message ?? r.error ?? "" }); })}>
          Approve
        </button>
        <button
          className="btn btn-secondary btn-sm"
          disabled={pending}
          onClick={() => {
            if (!confirm("Suspend this account? It will be signed out and its teams locked.")) return;
            start(async () => { const r = await suspendAccountAction(userId); setResult({ ok: r.ok, text: r.message ?? r.error ?? "" }); });
          }}
        >
          Suspend
        </button>
      </div>
      {result && !result.ok && <span className="text-xs" style={{ color: "var(--danger)" }}>{result.text}</span>}
    </div>
  );
}
