import type { Types } from "mongoose";
import { Plan, Subscription, Transaction, User, Workspace, type TransactionDoc } from "@/lib/db/models";

const PERIOD_DAYS = 30;

function planKey(slug: string): "free" | "pro" | "scale" {
  return slug === "free" ? "free" : slug === "pro" ? "pro" : "scale";
}

export type ActivateOptions = {
  amount?: number;
  /** Exact billing period from the payment processor (Paddle); otherwise 30 days. */
  periodStart?: Date;
  periodEnd?: Date;
  /** Processor payment ID: a payment already recorded under this ID is ignored. */
  externalId?: string;
  provider?: "manual" | "paddle";
  paddle?: { subscriptionId?: string; customerId?: string };
};

/**
 * Put a team on a plan and, for paid plans, record the payment.
 * Manual payments buy 30 days; paying again for the plan you're already on
 * extends from the current end date. Paddle payments use Paddle's own period.
 */
export async function activatePlan(workspaceId: Types.ObjectId | string, planId: Types.ObjectId | string, opts: ActivateOptions = {}): Promise<{ tx: TransactionDoc | null; duplicate?: boolean }> {
  if (opts.externalId && (await Transaction.exists({ externalId: opts.externalId }))) return { tx: null, duplicate: true };
  const [ws, plan, sub] = await Promise.all([Workspace.findById(workspaceId), Plan.findById(planId), Subscription.findOne({ workspaceId })]);
  if (!ws || !plan) throw new Error("Team or plan not found.");

  const now = new Date();
  const renewing = Boolean(sub && String(sub.planId) === String(plan._id) && sub.currentPeriodEnd && sub.currentPeriodEnd > now && ws.plan === plan.slug);
  let start: Date;
  let end: Date;
  if (opts.periodEnd) {
    start = opts.periodStart ?? now;
    end = opts.periodEnd;
  } else {
    start = renewing ? new Date(sub!.currentPeriodEnd!) : now;
    end = new Date(start);
    end.setDate(end.getDate() + PERIOD_DAYS);
  }

  await Subscription.updateOne(
    { workspaceId: ws._id },
    {
      $set: {
        planId: plan._id, planName: plan.name, priceMonthly: plan.priceMonthly, status: "active",
        currentPeriodStart: opts.periodEnd ? start : renewing ? sub!.currentPeriodStart : now, currentPeriodEnd: end, lastRenewedAt: now,
        provider: opts.provider ?? "manual",
        ...(opts.paddle?.subscriptionId ? { paddleSubscriptionId: opts.paddle.subscriptionId } : {}),
        ...(opts.paddle?.customerId ? { paddleCustomerId: opts.paddle.customerId } : {}),
      },
    },
    { upsert: true },
  );
  await Workspace.updateOne(
    { _id: ws._id },
    { $set: { plan: planKey(plan.slug), monthlyQuota: plan.monthlyQuota, dailyQuota: plan.dailyQuota, contactsQuota: plan.contactsQuota } },
  );

  if (plan.priceMonthly <= 0) return { tx: null };
  // A paying customer is approved to send (skips the new-account review).
  await User.updateOne({ _id: ws.ownerId, sendingApprovedAt: null }, { $set: { sendingApprovedAt: now } });
  try {
    const tx = await Transaction.create({
      workspaceId: ws._id, workspaceName: ws.name, planId: plan._id, planName: plan.name,
      amount: opts.amount ?? plan.priceMonthly, type: renewing ? "renewal" : ws.plan === "free" ? "new" : "upgrade", status: "paid",
      periodStart: start, periodEnd: end, provider: opts.provider ?? "manual",
      ...(opts.externalId ? { externalId: opts.externalId } : {}),
    });
    return { tx: tx.toObject() as TransactionDoc };
  } catch (err) {
    // Two copies of the same webhook raced; the first one recorded it.
    if ((err as { code?: number }).code === 11000) return { tx: null, duplicate: true };
    throw err;
  }
}
