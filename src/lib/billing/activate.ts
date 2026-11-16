import type { Types } from "mongoose";
import { Plan, Subscription, Transaction, User, Workspace, type TransactionDoc } from "@/lib/db/models";

const PERIOD_DAYS = 30;

function planKey(slug: string): "free" | "pro" | "scale" {
  return slug === "free" ? "free" : slug === "pro" ? "pro" : "scale";
}

/**
 * Put a team on a plan for one 30-day period and, for paid plans, record the
 * payment. Paying again for the plan you're already on extends from the current
 * end date (a renewal) instead of restarting the clock.
 */
export async function activatePlan(workspaceId: Types.ObjectId | string, planId: Types.ObjectId | string, opts: { amount?: number } = {}): Promise<{ tx: TransactionDoc | null }> {
  const [ws, plan, sub] = await Promise.all([Workspace.findById(workspaceId), Plan.findById(planId), Subscription.findOne({ workspaceId })]);
  if (!ws || !plan) throw new Error("Team or plan not found.");

  const now = new Date();
  const renewing = Boolean(sub && String(sub.planId) === String(plan._id) && sub.currentPeriodEnd && sub.currentPeriodEnd > now && ws.plan === plan.slug);
  const start = renewing ? new Date(sub!.currentPeriodEnd!) : now;
  const end = new Date(start);
  end.setDate(end.getDate() + PERIOD_DAYS);

  await Subscription.updateOne(
    { workspaceId: ws._id },
    {
      $set: {
        planId: plan._id, planName: plan.name, priceMonthly: plan.priceMonthly, status: "active",
        currentPeriodStart: renewing ? sub!.currentPeriodStart : now, currentPeriodEnd: end, lastRenewedAt: now,
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
  const tx = await Transaction.create({
    workspaceId: ws._id, workspaceName: ws.name, planId: plan._id, planName: plan.name,
    amount: opts.amount ?? plan.priceMonthly, type: renewing ? "renewal" : ws.plan === "free" ? "new" : "upgrade", status: "paid",
    periodStart: start, periodEnd: end,
  });
  return { tx: tx.toObject() as TransactionDoc };
}
