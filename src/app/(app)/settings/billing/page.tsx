import { requireDashboardContext } from "@/lib/auth/context";
import { BillingEmailForm, BillingAddressForm, TaxIdForm } from "@/components/dashboard/BillingForms";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { workspace } = await requireDashboardContext();
  const billing = (workspace.billing ?? {}) as {
    fullName?: string;
    country?: string;
    addressLine1?: string;
    taxIdType?: string;
    taxId?: string;
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="font-semibold mb-4">Subscriptions</h2>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between py-3">
            <span>Transactional</span>
            <span className="text-fg-muted">{workspace.monthlyQuota.toLocaleString()} emails</span>
            <span className="text-fg-muted">$0 / mo</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span>Marketing</span>
            <span className="text-fg-muted">{workspace.contactsQuota.toLocaleString()} contacts</span>
            <span className="text-fg-muted">$0 / mo</span>
          </div>
        </div>
        <button className="btn btn-secondary mt-4">Upgrade</button>
      </div>

      <BillingEmailForm email={workspace.billingEmail || ""} />

      <div className="card p-5">
        <h2 className="font-semibold">Payment methods</h2>
        <p className="text-sm text-fg-muted mt-1">There are no payment methods yet. Upgrade to a paid plan to add a new one.</p>
        <button className="btn btn-secondary mt-3">Add new card</button>
      </div>

      <BillingAddressForm
        fullName={billing.fullName || workspace.name}
        country={billing.country || "United States"}
        addressLine1={billing.addressLine1 || ""}
      />

      <TaxIdForm taxIdType={billing.taxIdType || "European VAT number"} taxId={billing.taxId || ""} />

      <div className="card p-5">
        <h2 className="font-semibold">Invoices</h2>
        <div className="py-10 text-center">
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm text-fg-subtle mt-1">Once a payment cycle ends, you&apos;ll be able to see invoices.</p>
        </div>
      </div>
    </div>
  );
}
