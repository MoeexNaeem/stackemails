import "server-only";
import { createElement } from "react";
import { User, Workspace, type TransactionDoc } from "@/lib/db/models";
import { sendSystemEmail } from "@/lib/email/system";
import { ReceiptEmail } from "@/emails/system";
import { env } from "@/lib/env";

export { receiptNumber } from "@/lib/billing/receipt-number";
import { receiptNumber } from "@/lib/billing/receipt-number";

/**
 * Email a receipt for a paid transaction to the workspace's billing email,
 * falling back to the owner's login email. Never throws.
 */
export async function sendReceiptEmail(tx: TransactionDoc) {
  if (tx.status !== "paid" || tx.amount <= 0) return { ok: false, error: "not a paid charge" };

  const workspace = await Workspace.findById(tx.workspaceId);
  if (!workspace) return { ok: false, error: "workspace not found" };
  const owner = await User.findById(workspace.ownerId);
  const to = workspace.billingEmail || owner?.email;
  if (!to) return { ok: false, error: "no recipient" };

  const periodStart = tx.periodStart ?? tx.createdAt ?? new Date();
  const periodEnd = tx.periodEnd ?? new Date(periodStart.getTime() + 30 * 86_400_000);

  return sendSystemEmail({
    kind: "receipt",
    to,
    subject: `Your Stack Emails receipt [${receiptNumber(tx)}]`,
    react: createElement(ReceiptEmail, {
      name: workspace.billing?.fullName || owner?.name || "there",
      receiptId: receiptNumber(tx),
      planName: tx.planName || "Subscription",
      amount: tx.amount,
      periodStart,
      periodEnd,
      billingUrl: `${env.appUrl}/settings/billing`,
    }),
  });
}
