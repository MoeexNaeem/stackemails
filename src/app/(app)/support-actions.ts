"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { SupportTicket, nextSequence } from "@/lib/db/models";
import { getRateLimiter } from "@/lib/ratelimit";
import { sendSystemEmail } from "@/lib/email/system";
import { TicketEmail } from "@/emails/system";
import { env } from "@/lib/env";

export type SupportState = { ok: boolean; error?: string; message?: string };

const CATEGORIES = ["general", "billing", "deliverability", "domains", "api", "bug", "account"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export async function createTicketAction(_prev: SupportState, formData: FormData): Promise<SupportState> {
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const rl = await getRateLimiter().check(`ticket:${user._id}`, 5, 3600_000);
  if (!rl.allowed) return { ok: false, error: "You've opened several tickets recently — please wait before opening another." };

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const category = CATEGORIES.find((c) => c === formData.get("category")) ?? "general";
  const priority = PRIORITIES.find((p) => p === formData.get("priority")) ?? "normal";
  if (subject.length < 4 || subject.length > 160) return { ok: false, error: "Subject must be 4–160 characters." };
  if (body.length < 10 || body.length > 10_000) return { ok: false, error: "Describe the issue in 10–10,000 characters." };

  const number = await nextSequence("ticket", 1000);
  await SupportTicket.create({
    number,
    workspaceId: workspace._id,
    userId: user._id,
    email: user.email,
    subject,
    category,
    priority,
    messages: [{ author: "customer", name: user.name, body }],
  });

  // Confirm to the customer and alert the support inbox.
  await Promise.all([
    sendSystemEmail({ kind: "ticket_opened", to: user.email, subject: `[#${number}] ${subject}`, react: createElement(TicketEmail, { heading: "We got your request", name: user.name, number, subject, body, footer: "Our team usually replies within one business day. Reply in Help → your ticket." }) }),
    sendSystemEmail({ kind: "ticket_alert", to: env.supportEmail, subject: `New ${priority} ticket #${number}: ${subject}`, react: createElement(TicketEmail, { heading: `New ticket from ${user.email}`, name: "team", number, subject, body, footer: `Team: ${workspace.name} · Category: ${category} · Priority: ${priority}` }) }),
  ]);
  revalidatePath("/help");
  return { ok: true, message: `Ticket #${number} opened — we've emailed you a confirmation.` };
}

export async function replyTicketAction(_prev: SupportState, formData: FormData): Promise<SupportState> {
  const { user } = await requireDashboardContext();
  await connectToDatabase();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!isValidObjectId(id)) return { ok: false, error: "Ticket not found." };
  if (body.length < 2 || body.length > 10_000) return { ok: false, error: "Write a reply first." };
  const t = await SupportTicket.findOne({ _id: id, userId: user._id });
  if (!t) return { ok: false, error: "Ticket not found." };
  t.messages.push({ author: "customer", name: user.name, body, at: new Date() });
  if (t.status === "resolved" || t.status === "closed" || t.status === "pending") t.status = "open";
  t.lastActivityAt = new Date();
  await t.save();
  await sendSystemEmail({ kind: "ticket_alert", to: env.supportEmail, subject: `Reply on #${t.number}: ${t.subject}`, react: createElement(TicketEmail, { heading: `${user.email} replied`, name: "team", number: t.number, subject: t.subject, body, footer: "Answer from the admin panel → Support." }) });
  revalidatePath("/help");
  return { ok: true, message: "Reply sent." };
}
