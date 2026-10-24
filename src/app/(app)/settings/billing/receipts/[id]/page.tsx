import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Transaction } from "@/lib/db/models";
import { receiptNumber } from "@/lib/billing/receipt-number";
import { PrintButton } from "@/components/ui/PrintButton";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Receipt" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const t = await Transaction.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!t) notFound();
  const billing = (workspace.billing ?? {}) as { fullName?: string; country?: string; addressLine1?: string; taxIdType?: string; taxId?: string };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/settings/billing" className="text-sm text-fg-subtle hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Billing</Link>
        <PrintButton />
      </div>
      <div className="rounded-2xl bg-white p-10 text-[#15171a] shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">Stack Emails</p>
            <p className="text-sm text-gray-500">stackemails.com · support@stackemails.com</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Receipt</p>
            <p className="font-mono">{receiptNumber(t)}</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div>
            <p className="text-gray-500">Billed to</p>
            <p className="font-medium">{billing.fullName || workspace.name}</p>
            {billing.addressLine1 && <p>{billing.addressLine1}</p>}
            <p>{billing.country}</p>
            {billing.taxId && <p className="text-gray-500">{billing.taxIdType}: {billing.taxId}</p>}
          </div>
          <div className="text-right">
            <p className="text-gray-500">Date</p>
            <p>{new Date(t.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
            <p className="mt-2 text-gray-500">Status</p>
            <p className="capitalize">{t.status}</p>
          </div>
        </div>
        <table className="mt-8 w-full text-sm">
          <thead><tr className="border-b border-gray-200 text-left text-gray-500"><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3">{t.planName} plan{t.periodStart && t.periodEnd ? ` · ${new Date(t.periodStart).toLocaleDateString()} – ${new Date(t.periodEnd).toLocaleDateString()}` : ""}</td>
              <td className="py-3 text-right">${t.amount.toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot><tr><td className="pt-4 font-semibold">Total</td><td className="pt-4 text-right font-semibold">${t.amount.toFixed(2)} USD</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
