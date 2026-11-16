"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ManualPayInfo = { details: { label: string; value: string }[]; reference: string; note?: string };

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-fg-subtle text-[13px] shrink-0">{label}</span>
      <button
        type="button"
        className="mono text-right text-[13px] hover:text-accent break-all"
        title="Copy"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          });
        }}
      >
        {copied ? "Copied" : value}
      </button>
    </div>
  );
}

/** Pay for a plan by bank transfer: shows the account details, then takes proof of the transfer. */
export function BankTransferForm({ plan, info, onClose }: { plan: { id: string; name: string; price: number }; info: ManualPayInfo; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("proof");
    if (file instanceof File && file.size > 5 * 1024 * 1024) return setError("The file is too large. The maximum is 5 MB.");
    fd.set("planId", plan.id);
    setBusy(true);
    try {
      const res = await fetch("/api/billing/manual-payment", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data?.error?.message ?? "Something went wrong. Try again.");
      else {
        setDone(data.message);
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <div className="card p-6">
        <p className="font-medium">Payment submitted</p>
        <p className="mt-2 text-sm text-fg-muted">{done}</p>
        <button className="btn btn-secondary btn-sm mt-4" onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">Pay for {plan.name} by bank transfer</p>
          <p className="mt-1 text-sm text-fg-muted">
            Send <strong className="text-fg">${plan.price.toFixed(2)} USD</strong> for 30 days of {plan.name}, then upload proof of the transfer. Your plan switches on as soon as we confirm the money has arrived, usually within a few hours.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <p className="eyebrow mb-2">1. Send the transfer</p>
          <div className="rounded-lg border border-border px-4 py-1">
            {info.details.map((d) => <CopyRow key={d.label} {...d} />)}
            <CopyRow label="Amount (USD)" value={plan.price.toFixed(2)} />
            <CopyRow label="Reference / memo" value={info.reference} />
          </div>
          <p className="mt-2 text-xs text-fg-subtle">
            Put <span className="mono">{info.reference}</span> in the transfer memo so we can match it to your team. Click any value to copy it. These are US (ACH) bank details; any transfer fees are paid by the sender.
          </p>
          {info.note && <p className="mt-2 text-xs text-fg-muted">{info.note}</p>}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <p className="eyebrow">2. Upload proof</p>
          <div>
            <label className="label" htmlFor="payerName">Name on the account you paid from</label>
            <input id="payerName" name="payerName" className="input" required maxLength={120} placeholder="Jane Smith / Acme Inc." />
          </div>
          <div>
            <label className="label" htmlFor="payerNote">Transaction ID or note <span className="text-fg-subtle">(optional)</span></label>
            <input id="payerNote" name="payerNote" className="input" maxLength={500} placeholder="e.g. bank confirmation number" />
          </div>
          <div>
            <label className="label" htmlFor="proof">Screenshot or receipt (PNG, JPG, WEBP or PDF, max 5 MB)</label>
            <input id="proof" name="proof" type="file" required accept="image/png,image/jpeg,image/webp,application/pdf" className="input py-1.5" />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? "Uploading…" : "Submit payment"}</button>
        </form>
      </div>
    </div>
  );
}
