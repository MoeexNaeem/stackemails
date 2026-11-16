"use client";

import { useState, useTransition } from "react";
import { requestPlanChangeAction } from "@/app/(app)/billing-actions";
import { BankTransferForm, type ManualPayInfo } from "@/components/settings/BankTransferForm";

type P = { id: string; slug: string; name: string; price: number; monthly: number; daily: number; contacts: number; features: string[] };

export function PlanPicker({ plans, currentSlug, manualPay = null, paymentPending = false }: { plans: P[]; currentSlug: string; manualPay?: ManualPayInfo | null; paymentPending?: boolean }) {
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [paying, setPaying] = useState<P | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const current = p.slug === currentSlug;
          return (
            <div key={p.id} className="card flex flex-col p-6" style={current ? { borderColor: "var(--violet)" } : undefined}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-normal">{p.name}</p>
                {current && <span className="badge" style={{ background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)" }}>Current</span>}
              </div>
              <p className="mt-2 text-3xl font-normal">${p.price}<span className="text-sm text-fg-subtle">/mo</span></p>
              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-fg-muted">
                <li>{p.monthly.toLocaleString()} emails / month</li>
                <li>{p.daily.toLocaleString()} emails / day</li>
                <li>{p.contacts.toLocaleString()} contacts</li>
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              {manualPay && p.price > 0 ? (
                // Paid plans: pay by bank transfer (also renews the current plan for another 30 days).
                <button
                  className={current ? "btn btn-secondary mt-5" : "btn btn-primary mt-5"}
                  disabled={paymentPending}
                  title={paymentPending ? "A payment is already waiting for confirmation." : undefined}
                  onClick={() => { setNote(null); setPaying(p); }}
                >
                  {current ? "Pay for next 30 days" : `Upgrade to ${p.name}`}
                </button>
              ) : (
                <button
                  className={current ? "btn btn-secondary mt-5" : "btn btn-primary mt-5"}
                  disabled={current || pending}
                  onClick={() => start(async () => { const r = await requestPlanChangeAction(p.id); setNote({ ok: r.ok, text: r.error ?? r.message ?? "" }); })}
                >
                  {current ? "Your plan" : `Switch to ${p.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {paying && manualPay && (
        <div className="mt-4">
          <BankTransferForm plan={{ id: paying.id, name: paying.name, price: paying.price }} info={manualPay} onClose={() => setPaying(null)} />
        </div>
      )}
      {note && <p className="mt-3 text-sm" style={{ color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</p>}
    </div>
  );
}
