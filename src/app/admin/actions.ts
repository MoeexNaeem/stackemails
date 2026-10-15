"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connect";
import {
  Workspace, Membership, ApiKey, Domain, EmailLog, Webhook, WebhookDelivery,
  Audience, Contact, ApiLog, Broadcast, Automation, Suppression, Template,
  Plan, Subscription, Transaction, User,
} from "@/lib/db/models";

export type AdminState = { ok: boolean; error?: string };

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "admin") throw new Error("Not authorized");
  await connectToDatabase();
  return user;
}

// ── Workspace status controls ─────────────────────────────
export async function setWorkspaceStatusAction(
  workspaceId: string,
  status: "active" | "restricted" | "suspended",
  reason = "",
): Promise<void> {
  await requireAdminUser();
  await Workspace.updateOne(
    { _id: workspaceId },
    { $set: { status, restrictedReason: status === "restricted" ? reason : "" } },
  );
  revalidatePath(`/admin/users/${workspaceId}`);
  revalidatePath("/admin/users");
}

export async function deleteWorkspaceAction(workspaceId: string): Promise<void> {
  await requireAdminUser();
  const ws = await Workspace.findById(workspaceId);
  if (!ws) return;

  // Cascade: remove all data owned by this workspace.
  await Promise.all([
    Membership.deleteMany({ workspaceId }),
    ApiKey.deleteMany({ workspaceId }),
    Domain.deleteMany({ workspaceId }),
    EmailLog.deleteMany({ workspaceId }),
    Webhook.deleteMany({ workspaceId }),
    WebhookDelivery.deleteMany({ workspaceId }),
    Audience.deleteMany({ workspaceId }),
    Contact.deleteMany({ workspaceId }),
    ApiLog.deleteMany({ workspaceId }),
    Broadcast.deleteMany({ workspaceId }),
    Automation.deleteMany({ workspaceId }),
    Suppression.deleteMany({ workspaceId }),
    Template.deleteMany({ workspaceId }),
    Subscription.deleteMany({ workspaceId }),
    Transaction.deleteMany({ workspaceId }),
  ]);
  // Remove the owner account if it belongs to no other workspace.
  const owner = ws.ownerId;
  await Workspace.deleteOne({ _id: workspaceId });
  if (owner && !(await Membership.findOne({ userId: owner }))) {
    await User.deleteOne({ _id: owner, platformRole: { $ne: "admin" } });
  }
  revalidatePath("/admin/users");
}

// ── Plan assignment for a tenant ──────────────────────────
export async function changeWorkspacePlanAction(workspaceId: string, planId: string): Promise<void> {
  await requireAdminUser();
  const [ws, plan] = await Promise.all([Workspace.findById(workspaceId), Plan.findById(planId)]);
  if (!ws || !plan) return;

  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  await Subscription.updateOne(
    { workspaceId },
    {
      $set: {
        planId: plan._id,
        planName: plan.name,
        priceMonthly: plan.priceMonthly,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
        lastRenewedAt: new Date(),
      },
    },
    { upsert: true },
  );
  await Workspace.updateOne(
    { _id: workspaceId },
    { $set: { plan: plan.slug === "free" ? "free" : plan.slug === "pro" ? "pro" : "scale", monthlyQuota: plan.monthlyQuota, dailyQuota: plan.dailyQuota, contactsQuota: plan.contactsQuota } },
  );
  if (plan.priceMonthly > 0) {
    await Transaction.create({
      workspaceId, workspaceName: ws.name, planId: plan._id, planName: plan.name,
      amount: plan.priceMonthly, type: "upgrade", status: "paid",
      periodStart: new Date(), periodEnd,
    });
  }
  revalidatePath(`/admin/users/${workspaceId}`);
  revalidatePath("/admin/revenue");
}

// ── Plan CRUD ─────────────────────────────────────────────
export async function savePlanAction(_prev: AdminState, formData: FormData): Promise<AdminState> {
  await requireAdminUser();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const data = {
    name,
    priceMonthly: Number(formData.get("priceMonthly") || 0),
    dailyQuota: Number(formData.get("dailyQuota") || 0),
    monthlyQuota: Number(formData.get("monthlyQuota") || 0),
    contactsQuota: Number(formData.get("contactsQuota") || 0),
    features: String(formData.get("features") || "").split("\n").map((s) => s.trim()).filter(Boolean),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };
  if (id) {
    await Plan.updateOne({ _id: id }, { $set: data });
  } else {
    await Plan.create({ ...data, slug: `${slug}-${Math.random().toString(36).slice(2, 6)}` });
  }
  revalidatePath("/admin/plans");
  return { ok: true };
}

export async function deletePlanAction(id: string): Promise<void> {
  await requireAdminUser();
  await Plan.deleteOne({ _id: id });
  revalidatePath("/admin/plans");
}
