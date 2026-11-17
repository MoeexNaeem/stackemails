"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { roleIn } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { Plan, SupportTicket, nextSequence } from "@/lib/db/models";
import { sendSystemEmail } from "@/lib/email/system";
import { TicketEmail } from "@/emails/system";
import { getRateLimiter } from "@/lib/ratelimit";
import { env } from "@/lib/env";

/**
 * Request a plan change. Until a payment processor is connected, upgrades are
 * approved by the platform admin (Admin → Users → Plan), which records the
 * transaction and emails a receipt.
 */
export async function requestPlanChangeAction(planId: string): Promise<{ ok: boolean; error?: string; message?: string }> {
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const role = await roleIn(user._id, workspace._id);
  if (role !== "owner" && role !== "admin") return { ok: false, error: "Only team owners and admins can change the plan." };
  if (!isValidObjectId(planId)) return { ok: false, error: "Plan not found." };
  const plan = await Plan.findOne({ _id: planId, isActive: true }).lean();
  if (!plan) return { ok: false, error: "Plan not found." };
  if (plan.slug === workspace.plan) return { ok: false, error: `You're already on ${plan.name}.` };
  const rl = await getRateLimiter().check(`plan-request:${workspace._id}`, 3, 86_400_000);
  if (!rl.allowed) return { ok: false, error: "You've already requested a change today. We'll be in touch shortly." };

  const number = await nextSequence("ticket", 1000);
  const body = `Please move team "${workspace.name}" (${workspace._id}) from ${workspace.plan} to ${plan.name} ($${plan.priceMonthly}/mo).`;
  await SupportTicket.create({ number, workspaceId: workspace._id, userId: user._id, email: user.email, subject: `Plan change to ${plan.name}`, category: "billing", priority: "high", messages: [{ author: "customer", name: user.name, body }] });
  await sendSystemEmail({ kind: "ticket_alert", to: env.supportEmail, subject: `Plan change request #${number}: ${workspace.name} to ${plan.name}`, react: createElement(TicketEmail, { heading: "Plan change requested", name: "team", number, subject: `Plan change to ${plan.name}`, body, footer: "Approve it in Admin > Users > the team > Plan." }) });
  revalidatePath("/help");
  return { ok: true, message: `Request sent (#${number}). We'll confirm by email and switch your plan, usually within a few hours.` };
}

// ── Paddle (card / PayPal) ────────────────────────────────
type PaddleStart =
  | { ok: true; mode: "checkout"; priceId: string; email: string; workspaceId: string }
  | { ok: true; mode: "changed"; message: string }
  | { ok: false; error: string };

/**
 * Upgrade with Paddle. With no Paddle subscription yet, return what the browser
 * needs to open Paddle's checkout; with one, switch its plan (Paddle charges or
 * credits the difference right away).
 */
export async function startPaddleUpgradeAction(planId: string): Promise<PaddleStart> {
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const { paddleChangePlan, paddleEnabled, paddlePriceFor } = await import("@/lib/billing/paddle");
  if (!paddleEnabled()) return { ok: false, error: "Card payments aren't available right now." };
  const role = await roleIn(user._id, workspace._id);
  if (role !== "owner" && role !== "admin") return { ok: false, error: "Only team owners and admins can change the plan." };
  if (workspace.status && workspace.status !== "active") return { ok: false, error: "This team is restricted. Contact support@stackemails.com." };
  if (!isValidObjectId(planId)) return { ok: false, error: "Plan not found." };
  const plan = await Plan.findOne({ _id: planId, isActive: true }).lean();
  const priceId = plan ? paddlePriceFor(plan.slug) : null;
  if (!plan || !priceId) return { ok: false, error: "This plan can't be bought online." };

  const { Subscription } = await import("@/lib/db/models");
  const sub = await Subscription.findOne({ workspaceId: workspace._id }).lean();
  if (sub?.provider === "paddle" && sub.paddleSubscriptionId && (sub.status === "active" || sub.status === "past_due") && workspace.plan !== "free") {
    if (plan.slug === workspace.plan) return { ok: false, error: `You're already on ${plan.name}.` };
    try {
      await paddleChangePlan(sub.paddleSubscriptionId, priceId);
    } catch (err) {
      return { ok: false, error: `Couldn't change the plan: ${(err as Error).message}` };
    }
    revalidatePath("/settings/billing");
    return { ok: true, mode: "changed", message: `Switching to ${plan.name}. The difference is charged or credited to your card, and the new limits apply within a minute.` };
  }
  return { ok: true, mode: "checkout", priceId, email: workspace.billingEmail || user.email, workspaceId: String(workspace._id) };
}

/** Link to Paddle's customer portal: cancel, change card, download invoices. */
export async function paddlePortalAction(): Promise<{ ok: boolean; url?: string; error?: string }> {
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const role = await roleIn(user._id, workspace._id);
  if (role !== "owner" && role !== "admin") return { ok: false, error: "Only team owners and admins can manage billing." };
  const { Subscription } = await import("@/lib/db/models");
  const sub = await Subscription.findOne({ workspaceId: workspace._id }).lean();
  if (!sub?.paddleCustomerId) return { ok: false, error: "No card subscription found for this team." };
  const { paddlePortalUrl } = await import("@/lib/billing/paddle");
  try {
    return { ok: true, url: await paddlePortalUrl(sub.paddleCustomerId, sub.paddleSubscriptionId) };
  } catch (err) {
    return { ok: false, error: `Couldn't open the billing portal: ${(err as Error).message}` };
  }
}
