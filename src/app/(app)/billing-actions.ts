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
  if (!rl.allowed) return { ok: false, error: "You've already requested a change today — we'll be in touch shortly." };

  const number = await nextSequence("ticket", 1000);
  const body = `Please move team "${workspace.name}" (${workspace._id}) from ${workspace.plan} to ${plan.name} ($${plan.priceMonthly}/mo).`;
  await SupportTicket.create({ number, workspaceId: workspace._id, userId: user._id, email: user.email, subject: `Plan change → ${plan.name}`, category: "billing", priority: "high", messages: [{ author: "customer", name: user.name, body }] });
  await sendSystemEmail({ kind: "ticket_alert", to: env.supportEmail, subject: `Plan change request #${number}: ${workspace.name} → ${plan.name}`, react: createElement(TicketEmail, { heading: "Plan change requested", name: "team", number, subject: `Plan change → ${plan.name}`, body, footer: "Approve it in Admin → Users → the team → Plan." }) });
  revalidatePath("/help");
  return { ok: true, message: `Request sent (#${number}). We'll confirm by email and switch your plan — usually within a few hours.` };
}
