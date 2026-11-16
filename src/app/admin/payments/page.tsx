import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { ManualPayment } from "@/lib/db/models";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/format";
import { manualPayEnabled } from "@/lib/billing/manual";
import { PaymentReview } from "@/components/admin/PaymentReview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payments" };

const STATUS_COLOR: Record<string, string> = { pending: "#f59e0b", approved: "var(--success, #16a34a)", rejected: "var(--danger)" };

export default async function AdminPaymentsPage() {
  await requireAdmin();
  await connectToDatabase();
  const [pending, recent] = await Promise.all([
    ManualPayment.find({ status: "pending" }).sort({ createdAt: 1 }).lean(),
    ManualPayment.find({ status: { $ne: "pending" } }).sort({ reviewedAt: -1 }).limit(30).lean(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">Payments</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Bank transfers customers say they&apos;ve sent. <strong>Only approve once the money shows up in your bank account</strong>: screenshots are easy to fake. Match the amount and the reference code (SE-…) in the transfer memo.
        </p>
        {!manualPayEnabled() && (
          <p className="mt-2 text-sm" style={{ color: "var(--danger)" }}>Bank transfer is turned off: set MANUAL_PAY_BENEFICIARY and MANUAL_PAY_ACCOUNT_NUMBER in the server&apos;s .env.</p>
        )}
      </div>

      <div className="space-y-4">
        <p className="eyebrow">Waiting for review ({pending.length})</p>
        {pending.length === 0 ? (
          <div className="card"><EmptyState title="Nothing to review" description="New bank-transfer payments appear here, and you get an email for each one." /></div>
        ) : (
          pending.map((p) => (
            <div key={String(p._id)} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 space-y-1 text-sm">
                  <p className="text-base font-medium">#{p.number} · ${p.amount.toFixed(2)} · {p.planName}</p>
                  <p className="text-fg-muted">
                    Team <Link href={`/admin/users/${p.workspaceId}`} className="text-accent hover:underline">{p.workspaceName}</Link> · {p.email}
                  </p>
                  <p className="text-fg-muted">Reference <span className="mono text-fg">{p.reference}</span> · paid from <span className="text-fg">{p.payerName}</span></p>
                  {p.payerNote && <p className="text-fg-muted">Note: <span className="text-fg">{p.payerNote}</span></p>}
                  <p className="text-fg-subtle">Submitted {timeAgo(p.createdAt)}</p>
                </div>
                <a href={`/api/admin/payments/${p._id}/proof`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                  {p.proof?.contentType === "application/pdf" ? "Download proof (PDF)" : "View proof"}
                </a>
              </div>
              {p.proof?.contentType && p.proof.contentType !== "application/pdf" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/admin/payments/${p._id}/proof`} alt={`Proof for payment ${p.number}`} className="mt-4 max-h-[420px] rounded-lg border border-border object-contain" />
              )}
              <PaymentReview id={String(p._id)} />
            </div>
          ))
        )}
      </div>

      <div className="card overflow-x-auto">
        <p className="px-6 pt-5 pb-3 font-medium">Recently reviewed</p>
        {recent.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-fg-subtle">None yet.</p>
        ) : (
          <table className="table min-w-[720px]">
            <thead><tr><th>#</th><th>Team</th><th>Plan</th><th>Amount</th><th>Status</th><th className="text-right">Reviewed</th></tr></thead>
            <tbody>
              {recent.map((p) => (
                <tr key={String(p._id)}>
                  <td className="mono text-[13px]">{p.number}</td>
                  <td><Link href={`/admin/users/${p.workspaceId}`} className="hover:text-accent">{p.workspaceName}</Link> <span className="text-fg-subtle">{p.email}</span></td>
                  <td>{p.planName}</td>
                  <td>${p.amount.toFixed(2)}</td>
                  <td className="capitalize" style={{ color: STATUS_COLOR[p.status] }} title={p.rejectReason || undefined}>{p.status}</td>
                  <td className="text-right text-fg-subtle">{p.reviewedAt ? timeAgo(p.reviewedAt) : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
