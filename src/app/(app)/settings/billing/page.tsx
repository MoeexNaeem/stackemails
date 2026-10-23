import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Plan, Subscription, Transaction } from "@/lib/db/models";
import { BillingAddressForm, BillingEmailForm, TaxIdForm } from "@/components/dashboard/BillingForms";
import { PlanPicker } from "@/components/settings/PlanPicker";
import { receiptNumber } from "@/lib/billing/receipt-number";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const [plans, sub, txs] = await Promise.all([
    Plan.find({ isActive: true }).sort({ order: 1, priceMonthly: 1 }).lean(),
    Subscription.findOne({ workspaceId: workspace._id }).lean(),
    Transaction.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  const billing = (workspace.billing ?? {}) as { fullName?: string; country?: string; addressLine1?: string; taxIdType?: string; taxId?: string };
  const current = plans.find((p) => p.slug === workspace.plan);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Current plan</p>
            <p className="mt-1 text-2xl font-normal">{current?.name ?? workspace.plan} <span className="text-base text-fg-muted">· ${current?.priceMonthly ?? 0}/mo</span></p>
            <p className="mt-1 text-sm text-fg-muted">{workspace.monthlyQuota.toLocaleString()} emails / month · {workspace.dailyQuota.toLocaleString()} / day · {workspace.contactsQuota.toLocaleString()} contacts</p>
          </div>
          {sub?.currentPeriodEnd && (
            <div className="text-right text-sm">
              <p className="text-fg-subtle">{sub.status === "active" ? "Renews" : "Status"}</p>
              <p>{sub.status === "active" ? new Date(sub.currentPeriodEnd).toLocaleDateString() : sub.status}</p>
            </div>
          )}
        </div>
      </div>

      <PlanPicker
        currentSlug={workspace.plan}
        plans={plans.map((p) => ({ id: String(p._id), slug: p.slug, name: p.name, price: p.priceMonthly, monthly: p.monthlyQuota, daily: p.dailyQuota, contacts: p.contactsQuota, features: p.features ?? [] }))}
      />

      <BillingEmailForm email={workspace.billingEmail || ""} />
      <BillingAddressForm fullName={billing.fullName || workspace.name} country={billing.country || "United States"} addressLine1={billing.addressLine1 || ""} />
      <TaxIdForm taxIdType={billing.taxIdType || "European VAT number"} taxId={billing.taxId || ""} />

      <div className="card overflow-hidden">
        <p className="px-6 pt-5 pb-3 font-medium">Invoices &amp; receipts</p>
        {txs.length === 0 ? (
          <p className="px-6 pb-8 text-sm text-fg-subtle">No invoices yet. Once you&apos;re on a paid plan, receipts appear here.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Receipt</th><th>Plan</th><th>Amount</th><th>Status</th><th className="text-right">Date</th></tr></thead>
            <tbody>
              {txs.map((t) => (
                <tr key={String(t._id)}>
                  <td><Link href={`/settings/billing/receipts/${t._id}`} className="mono text-[13px] hover:text-accent">{receiptNumber(t)}</Link></td>
                  <td>{t.planName}</td>
                  <td>${t.amount.toFixed(2)}</td>
                  <td className="capitalize text-fg-muted">{t.status}</td>
                  <td className="text-right text-fg-subtle">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
