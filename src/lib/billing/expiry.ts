import { createElement } from "react";
import type { Types } from "mongoose";
import { Membership, Plan, Subscription, User, Workspace } from "@/lib/db/models";
import { sendSystemEmail } from "@/lib/email/system";
import { NoticeEmail } from "@/emails/system";
import { env } from "@/lib/env";

/**
 * Paid periods from bank transfers last 30 days. This runs from the worker:
 *   - 3 days before the end: reminder to pay for the next period
 *   - after the end: 3 days' grace (status "past_due")
 *   - after the grace: the team moves back to the Free plan
 * Teams owned by a platform admin are never touched.
 */
const DAY = 86_400_000;
const REMIND_BEFORE = 3 * DAY;
const GRACE = 3 * DAY;

async function ownerEmail(workspaceId: Types.ObjectId): Promise<{ email: string; isAdmin: boolean } | null> {
  const m = await Membership.findOne({ workspaceId, role: "owner" }).select("userId").lean();
  const u = m ? await User.findById(m.userId).select("email platformRole").lean() : null;
  return u ? { email: u.email, isAdmin: u.platformRole === "admin" } : null;
}

const billingLink = { label: "Pay for the next 30 days", href: `${env.appUrl}/settings/billing` };

export async function runPlanExpiry(now = new Date()): Promise<{ reminded: number; pastDue: number; downgraded: number }> {
  const stats = { reminded: 0, pastDue: 0, downgraded: 0 };
  const subs = await Subscription.find({
    priceMonthly: { $gt: 0 },
    status: { $in: ["active", "past_due"] },
    currentPeriodEnd: { $ne: null, $lte: new Date(now.getTime() + REMIND_BEFORE) },
  }).limit(200);
  if (!subs.length) return stats;
  const free = await Plan.findOne({ slug: "free" }).lean();

  for (const sub of subs) {
    const ws = await Workspace.findById(sub.workspaceId).select("name plan").lean();
    const owner = await ownerEmail(sub.workspaceId);
    if (!ws || !owner || owner.isAdmin || ws.plan === "free") continue;
    const end = sub.currentPeriodEnd!;

    if (end.getTime() > now.getTime()) {
      // Reminder, once per period.
      if (sub.reminderSentFor && sub.reminderSentFor.getTime() === end.getTime()) continue;
      await Subscription.updateOne({ _id: sub._id }, { $set: { reminderSentFor: end } });
      await sendSystemEmail({
        kind: "account_notice", to: owner.email, subject: `Your ${sub.planName} plan renews on ${end.toDateString()}`,
        react: createElement(NoticeEmail, {
          heading: `Your ${sub.planName} plan ends soon`,
          paragraphs: [`Team "${ws.name}" is paid up until ${end.toDateString()}. To keep ${sub.planName}, send the next payment ($${sub.priceMonthly}) from Settings > Billing before then.`],
          cta: billingLink,
        }),
      });
      stats.reminded++;
    } else if (end.getTime() + GRACE > now.getTime()) {
      if (sub.status === "past_due") continue;
      await Subscription.updateOne({ _id: sub._id }, { $set: { status: "past_due" } });
      await sendSystemEmail({
        kind: "account_notice", to: owner.email, subject: `Payment due: your ${sub.planName} plan has ended`,
        react: createElement(NoticeEmail, {
          heading: "Your paid period has ended",
          paragraphs: [`Team "${ws.name}" keeps ${sub.planName} for 3 more days. If we don't receive the next payment by then, the team moves back to the Free plan (your data stays).`],
          cta: billingLink,
        }),
      });
      stats.pastDue++;
    } else {
      await Subscription.updateOne({ _id: sub._id }, { $set: { status: "expired", planId: free?._id, planName: free?.name ?? "Free", priceMonthly: 0 } });
      await Workspace.updateOne(
        { _id: sub.workspaceId },
        { $set: { plan: "free", ...(free ? { monthlyQuota: free.monthlyQuota, dailyQuota: free.dailyQuota, contactsQuota: free.contactsQuota } : {}) } },
      );
      await sendSystemEmail({
        kind: "account_notice", to: owner.email, subject: `Team "${ws.name}" is now on the Free plan`,
        react: createElement(NoticeEmail, {
          heading: "You're back on the Free plan",
          paragraphs: [`We didn't receive a payment for ${sub.planName}, so team "${ws.name}" now has Free plan limits. Your domains, contacts and history are untouched; pay any time to switch back.`],
          cta: { label: "Upgrade again", href: `${env.appUrl}/settings/billing` },
        }),
      });
      stats.downgraded++;
    }
  }
  return stats;
}
