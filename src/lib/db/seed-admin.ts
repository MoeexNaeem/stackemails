import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import {
  Plan, Subscription, Transaction, Workspace, User, Membership,
  type PlanDoc, type WorkspaceDoc,
} from "@/lib/db/models";
import { syncPlatformAdmin } from "@/lib/admin-account";
import { createAccount } from "@/lib/accounts";

const PLAN_DEFS = [
  { name: "Free", slug: "free", priceMonthly: 0, dailyQuota: 100, monthlyQuota: 3000, contactsQuota: 1000, order: 0, features: ["3,000 emails / month", "1 domain", "Community support"] },
  { name: "Pro", slug: "pro", priceMonthly: 25, dailyQuota: 5000, monthlyQuota: 150000, contactsQuota: 50000, order: 1, features: ["150,000 emails / month", "10 domains", "Webhooks", "Email support"] },
  { name: "Scale", slug: "scale", priceMonthly: 100, dailyQuota: 50000, monthlyQuota: 1500000, contactsQuota: 500000, order: 2, features: ["1.5M emails / month", "Unlimited domains", "Dedicated IP option", "Priority support"] },
];

const COMPANIES = [
  { name: "Globex", plan: "pro", months: 5, status: "active" as const },
  { name: "Initech", plan: "scale", months: 4, status: "active" as const },
  { name: "Umbrella Co", plan: "pro", months: 3, status: "restricted" as const },
  { name: "Soylent", plan: "free", months: 2, status: "active" as const },
  { name: "Hooli", plan: "scale", months: 5, status: "active" as const },
  { name: "Stark Labs", plan: "pro", months: 1, status: "active" as const },
];

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

async function workspaceOf(userId: Types.ObjectId | string): Promise<WorkspaceDoc | null> {
  const m = await Membership.findOne({ userId });
  return m ? Workspace.findById(m.workspaceId) : null;
}

async function backdatedTransaction(data: Record<string, unknown>, when: Date): Promise<void> {
  const doc = new Transaction(data as never);
  doc.createdAt = when;
  doc.updatedAt = when;
  await doc.save({ timestamps: false });
}

/** Attach a subscription + backdated revenue to a workspace and align its quotas. */
async function subscribe(ws: WorkspaceDoc, plan: PlanDoc, monthsActive: number, status: "active" | "restricted"): Promise<void> {
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 20);

  await Subscription.updateOne(
    { workspaceId: ws._id },
    {
      $set: {
        planId: plan._id,
        planName: plan.name,
        priceMonthly: plan.priceMonthly,
        status: "active",
        autoRenew: true,
        currentPeriodStart: monthsAgo(0),
        currentPeriodEnd: periodEnd,
        lastRenewedAt: new Date(),
      },
    },
    { upsert: true },
  );

  await Workspace.updateOne(
    { _id: ws._id },
    {
      $set: {
        plan: plan.slug === "free" ? "free" : plan.slug === "pro" ? "pro" : "scale",
        monthlyQuota: plan.monthlyQuota,
        dailyQuota: plan.dailyQuota,
        contactsQuota: plan.contactsQuota,
        status,
        "usage.sent": Math.floor(plan.monthlyQuota * (0.1 + Math.random() * 0.4)),
      },
    },
  );

  if (plan.priceMonthly > 0) {
    for (let k = monthsActive - 1; k >= 0; k--) {
      await backdatedTransaction(
        {
          workspaceId: ws._id,
          workspaceName: ws.name,
          planId: plan._id,
          planName: plan.name,
          amount: plan.priceMonthly,
          type: k === monthsActive - 1 ? "new" : "renewal",
          status: "paid",
          periodStart: monthsAgo(k),
          periodEnd: monthsAgo(k - 1),
        },
        monthsAgo(k),
      );
    }
  }
}

export async function seedAdminData(): Promise<void> {
  await connectToDatabase();

  // 1. Plans
  const plans: Record<string, PlanDoc> = {};
  for (const def of PLAN_DEFS) {
    let p = await Plan.findOne({ slug: def.slug });
    if (!p) p = await Plan.create(def);
    plans[def.slug] = p;
  }

  // 2. Platform admin account (from ADMIN_EMAIL / ADMIN_PASSWORD)
  await syncPlatformAdmin();

  // 3. Give the existing demo (Acme) workspace a Pro subscription
  const demo = await User.findOne({ email: "demo@stackemails.com" });
  if (demo) {
    const ws = await workspaceOf(demo._id);
    if (ws && !(await Subscription.findOne({ workspaceId: ws._id }))) {
      await subscribe(ws, plans.pro, 4, "active");
    }
  }

  // 4. A handful of demo tenant companies (only seed once)
  if ((await Workspace.countDocuments()) < 5) {
    for (const c of COMPANIES) {
      const email = `owner@${c.name.toLowerCase().replace(/[^a-z]/g, "")}.com`;
      if (await User.findOne({ email })) continue;
      const createdAt = monthsAgo(c.months);
      await createAccount({ name: `${c.name} Owner`, email, password: "password123", workspaceName: c.name });
      const user = await User.findOne({ email });
      // createdAt is immutable to Mongoose updates - backdate via the raw driver.
      await User.collection.updateOne({ _id: user!._id }, { $set: { createdAt } });
      const ws = await workspaceOf(user!._id);
      if (ws) {
        await Workspace.collection.updateOne({ _id: ws._id }, { $set: { createdAt } });
        await subscribe(ws, plans[c.plan], c.months, c.status);
        if (c.status === "restricted") {
          await Workspace.updateOne({ _id: ws._id }, { $set: { restrictedReason: "High bounce rate, under review" } });
        }
      }
    }
  }
}
