"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connect";
import { ManualPayment } from "@/lib/db/models";
import { activatePlan } from "@/lib/billing/activate";
import { sendReceiptEmail } from "@/lib/billing/receipts";
import { sendSystemEmail } from "@/lib/email/system";
import { NoticeEmail } from "@/emails/system";
import { env } from "@/lib/env";

export type PaymentReviewState = { ok: boolean; error?: string; message?: string };

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "admin" || !user.mfaEnabled) throw new Error("Not authorized");
  await connectToDatabase();
  return user;
}

/** The money has arrived: activate the plan, record revenue, email a receipt. */
export async function approveManualPaymentAction(id: string): Promise<PaymentReviewState> {
  const admin = await requireAdminUser();
  if (!isValidObjectId(id)) return { ok: false, error: "Payment not found." };
  // Claim it atomically so a double click can't activate twice.
  const payment = await ManualPayment.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: "approved", reviewedBy: admin._id, reviewedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!payment) return { ok: false, error: "This payment was already reviewed." };
  try {
    const { tx } = await activatePlan(payment.workspaceId, payment.planId, { amount: payment.amount });
    if (tx) {
      await ManualPayment.updateOne({ _id: payment._id }, { $set: { transactionId: tx._id } });
      after(() => sendReceiptEmail(tx));
    }
  } catch (err) {
    await ManualPayment.updateOne({ _id: payment._id }, { $set: { status: "pending" }, $unset: { reviewedBy: 1, reviewedAt: 1 } });
    return { ok: false, error: (err as Error).message || "Could not activate the plan." };
  }
  revalidatePath("/admin/payments");
  revalidatePath("/admin/revenue");
  return { ok: true, message: `Approved. ${payment.workspaceName} is now on ${payment.planName}, and a receipt was emailed.` };
}

/** Not received / doesn't match: tell the customer why. */
export async function rejectManualPaymentAction(id: string, reason: string): Promise<PaymentReviewState> {
  const admin = await requireAdminUser();
  if (!isValidObjectId(id)) return { ok: false, error: "Payment not found." };
  const why = String(reason ?? "").trim().slice(0, 500) || "We couldn't find this transfer in our account.";
  const payment = await ManualPayment.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: "rejected", rejectReason: why, reviewedBy: admin._id, reviewedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!payment) return { ok: false, error: "This payment was already reviewed." };
  after(() =>
    sendSystemEmail({
      kind: "account_notice",
      to: payment.email,
      subject: `We couldn't confirm your payment #${payment.number}`,
      react: createElement(NoticeEmail, {
        heading: "We couldn't confirm your bank transfer",
        paragraphs: [
          `Your payment #${payment.number} for ${payment.planName} ($${payment.amount.toFixed(2)}) wasn't approved.`,
          `Reason: ${why}`,
          "If you did send the money, reply to support@stackemails.com with your bank's confirmation and we'll sort it out.",
        ],
        cta: { label: "Open billing", href: `${env.appUrl}/settings/billing` },
      }),
    }),
  );
  revalidatePath("/admin/payments");
  return { ok: true, message: "Rejected, and the customer was emailed the reason." };
}
