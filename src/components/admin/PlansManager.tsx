"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePlanAction, deletePlanAction, type AdminState } from "@/app/admin/actions";

export type PlanView = {
  id: string;
  name: string;
  priceMonthly: number;
  dailyQuota: number;
  monthlyQuota: number;
  contactsQuota: number;
  features: string[];
  isActive: boolean;
  subscribers: number;
};

const initial: AdminState = { ok: false };

export function PlansManager({ plans }: { plans: PlanView[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PlanView | null>(null);
  const [creating, setCreating] = useState(false);
  const [state, action, pending] = useActionState(savePlanAction, initial);
  const [, start] = useTransition();

  useEffect(() => {
    if (state.ok) {
      setEditing(null);
      setCreating(false);
      router.refresh();
    }
  }, [state, router]);

  function remove(id: string) {
    if (!confirm("Delete this plan? Existing subscribers keep their current quotas.")) return;
    start(async () => {
      await deletePlanAction(id);
      router.refresh();
    });
  }

  const showForm = creating || editing;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Plans</h1>
        <button className="btn btn-primary" onClick={() => { setCreating(true); setEditing(null); }}>+ Create plan</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.id} className="card p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <p className="text-2xl font-semibold mt-1">${p.priceMonthly}<span className="text-sm text-fg-subtle font-normal">/mo</span></p>
              </div>
              {!p.isActive && <span className="badge" style={{ background: "var(--bg-hover)", color: "var(--fg-subtle)" }}>inactive</span>}
            </div>
            <ul className="mt-3 space-y-1 text-sm text-fg-muted flex-1">
              <li>{p.monthlyQuota.toLocaleString()} emails/mo</li>
              <li>{p.dailyQuota.toLocaleString()} emails/day</li>
              <li>{p.contactsQuota.toLocaleString()} contacts</li>
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <p className="text-xs text-fg-subtle mt-3">{p.subscribers} subscriber{p.subscribers === 1 ? "" : "s"}</p>
            <div className="flex gap-2 mt-4">
              <button className="btn btn-secondary flex-1" onClick={() => { setEditing(p); setCreating(false); }}>Edit</button>
              <button className="btn btn-danger" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => { setCreating(false); setEditing(null); }}>
          <form action={action} className="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-lg mb-4">{editing ? "Edit plan" : "Create plan"}</h2>
            <input type="hidden" name="id" value={editing?.id ?? ""} />
            <div className="space-y-3">
              <div><label className="label">Name</label><input name="name" className="input" defaultValue={editing?.name ?? ""} required autoFocus /></div>
              <div><label className="label">Price / month (USD)</label><input name="priceMonthly" type="number" className="input" defaultValue={editing?.priceMonthly ?? 0} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Daily quota</label><input name="dailyQuota" type="number" className="input" defaultValue={editing?.dailyQuota ?? 100} /></div>
                <div><label className="label">Monthly quota</label><input name="monthlyQuota" type="number" className="input" defaultValue={editing?.monthlyQuota ?? 3000} /></div>
              </div>
              <div><label className="label">Contacts quota</label><input name="contactsQuota" type="number" className="input" defaultValue={editing?.contactsQuota ?? 1000} /></div>
              <div><label className="label">Features (one per line)</label><textarea name="features" className="input" rows={3} defaultValue={(editing?.features ?? []).join("\n")} /></div>
              <label className="flex items-center gap-2 text-sm text-fg-muted">
                <input type="checkbox" name="isActive" defaultChecked={editing ? editing.isActive : true} className="accent-[var(--accent)]" /> Active (available to tenants)
              </label>
              {state.error && <p className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" className="btn btn-secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save plan"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
