"use client";

import { useState, useTransition } from "react";
import { requestPlanChangeAction } from "@/app/(app)/billing-actions";

type P = { id: string; slug: string; name: string; price: number; monthly: number; daily: number; contacts: number; features: string[] };

export function PlanPicker({ plans, currentSlug }: { plans: P[]; currentSlug: string }) {
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
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
              <button
                className={current ? "btn btn-secondary mt-5" : "btn btn-primary mt-5"}
                disabled={current || pending}
                onClick={() => start(async () => { const r = await requestPlanChangeAction(p.id); setNote({ ok: r.ok, text: r.error ?? r.message ?? "" }); })}
              >
                {current ? "Your plan" : `Switch to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
      {note && <p className="mt-3 text-sm" style={{ color: note.ok ? "var(--success)" : "var(--danger)" }}>{note.text}</p>}
    </div>
  );
}
