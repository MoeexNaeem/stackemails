"use client";

import { useActionState } from "react";
import { updateBillingAddressAction, updateTaxIdAction, type ActionState } from "@/app/(app)/actions";
import { setBillingEmailAction } from "@/app/(app)/settings-actions";

const initial: ActionState = { ok: false };

function Saved({ state }: { state: { ok: boolean; error?: string } }) {
  if (state.error) return <span className="text-sm" style={{ color: "var(--danger)" }}>{state.error}</span>;
  if (state.ok) return <span className="text-sm" style={{ color: "var(--success)" }}>Saved.</span>;
  return null;
}

export function BillingEmailForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(setBillingEmailAction, { ok: false } as { ok: boolean; error?: string });
  return (
    <div className="card p-5">
      <h2 className="font-semibold">Billing email</h2>
      <p className="text-sm text-fg-muted mt-1">Invoices will be sent to the following email address.</p>
      <form action={action} className="mt-3 flex items-center gap-3">
        <input name="email" type="email" className="input max-w-sm" defaultValue={email} placeholder="you@company.com" />
        <button className="btn btn-secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <Saved state={state} />
      </form>
    </div>
  );
}

export function BillingAddressForm({
  fullName,
  country,
  addressLine1,
}: {
  fullName: string;
  country: string;
  addressLine1: string;
}) {
  const [state, action, pending] = useActionState(updateBillingAddressAction, initial);
  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-4">Billing address</h2>
      <form action={action} className="space-y-3 max-w-md">
        <div>
          <label className="label">Full name</label>
          <input name="fullName" className="input" defaultValue={fullName} />
        </div>
        <div>
          <label className="label">Country or region</label>
          <select name="country" className="input" defaultValue={country}>
            {["United States", "United Kingdom", "Pakistan", "Germany", "Canada", "Australia", "India"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Address line 1</label>
          <input name="addressLine1" className="input" defaultValue={addressLine1} />
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          <Saved state={state} />
        </div>
      </form>
    </div>
  );
}

export function TaxIdForm({ taxIdType, taxId }: { taxIdType: string; taxId: string }) {
  const [state, action, pending] = useActionState(updateTaxIdAction, initial);
  return (
    <div className="card p-5">
      <h2 className="font-semibold">Tax ID</h2>
      <p className="text-sm text-fg-muted mt-1">Specify a tax ID to have it appear on your invoices.</p>
      <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
        <select name="taxIdType" className="input w-56" defaultValue={taxIdType}>
          {["European VAT number", "US EIN", "UK VAT number", "Australia ABN", "Other"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <input name="taxId" className="input w-48" defaultValue={taxId} placeholder="DE123456789" />
        <button className="btn btn-secondary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
        <Saved state={state} />
      </form>
    </div>
  );
}
