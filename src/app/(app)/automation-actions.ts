"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation, AutomationEvent, Segment } from "@/lib/db/models";
import { assertSenderAllowed } from "@/lib/email/guards";
import { upsertContact } from "@/lib/contacts";
import { runAutomations } from "@/lib/automations/run";

export type AutoState = { ok: boolean; error?: string; message?: string };

const stepSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("wait"), waitDuration: z.number().int().min(1).max(720), waitUnit: z.enum(["minutes", "hours", "days"]) }),
  z.object({ type: z.literal("email"), from: z.string().max(320), subject: z.string().max(998), html: z.string().max(500_000) }),
]);
const automationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  trigger: z.enum(["contact.added", "event"]),
  audienceId: z.string().optional(),
  eventName: z.string().max(80).optional(),
  steps: z.array(stepSchema).max(20),
});

async function ctx() {
  const c = await requireDashboardContext();
  await connectToDatabase();
  return c.workspace;
}

export async function createAutomationAction(): Promise<void> {
  const workspace = await ctx();
  const a = await Automation.create({
    workspaceId: workspace._id,
    name: "Untitled automation",
    status: "draft",
    trigger: "contact.added",
    steps: [
      { type: "wait", waitDuration: 1, waitUnit: "days" },
      { type: "email", subject: "Welcome, {{first_name|\"there\"}}!", from: "", html: "<h1>Welcome aboard</h1><p>Thanks for joining us.</p>" },
    ],
  });
  revalidatePath("/automations");
  redirect(`/automations/${a._id}`);
}

/** Validate + save the whole automation (name, trigger, ordered steps). */
export async function saveAutomationAction(id: string, raw: unknown): Promise<AutoState> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return { ok: false, error: "Automation not found." };
  const parsed = automationSchema.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i?.path?.join(" › ") || "Input"}: ${i?.message}` };
  }
  const input = parsed.data;
  const a = await Automation.findOne({ _id: id, workspaceId: workspace._id });
  if (!a) return { ok: false, error: "Automation not found." };

  if (input.trigger === "event") {
    if (!input.eventName || !(await AutomationEvent.exists({ workspaceId: workspace._id, name: input.eventName }))) {
      return { ok: false, error: "Choose an event (create one under Automations → Events)." };
    }
  }
  if (input.audienceId && (!isValidObjectId(input.audienceId) || !(await Segment.exists({ _id: input.audienceId, workspaceId: workspace._id })))) {
    return { ok: false, error: "Segment not found." };
  }
  if (a.status === "active") {
    const err = await activationError(workspace._id, input);
    if (err) return { ok: false, error: `Can't save an active automation: ${err}` };
  }

  a.name = input.name;
  a.trigger = input.trigger;
  a.eventName = input.trigger === "event" ? input.eventName! : "";
  a.audienceId = input.audienceId ? (input.audienceId as never) : undefined;
  a.steps = input.steps as never;
  await a.save();
  revalidatePath("/automations");
  revalidatePath(`/automations/${id}`);
  return { ok: true, message: "Saved." };
}

async function activationError(workspaceId: unknown, a: { steps: z.infer<typeof stepSchema>[] }): Promise<string | null> {
  const emails = a.steps.filter((s): s is Extract<z.infer<typeof stepSchema>, { type: "email" }> => s.type === "email");
  if (!emails.length) return "add at least one email step.";
  for (const [i, s] of emails.entries()) {
    if (!s.from || !s.subject || !s.html) return `email step ${i + 1} needs a from address, subject and content.`;
    const sender = await assertSenderAllowed(workspaceId as never, s.from);
    if (!sender.ok) return `email step ${i + 1}: ${sender.message}`;
  }
  return null;
}

export async function toggleAutomationAction(id: string): Promise<AutoState> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return { ok: false, error: "Automation not found." };
  const a = await Automation.findOne({ _id: id, workspaceId: workspace._id });
  if (!a) return { ok: false, error: "Automation not found." };
  if (a.status !== "active") {
    const err = await activationError(workspace._id, { steps: (a.steps ?? []) as never });
    if (err) return { ok: false, error: `Can't activate yet: ${err}` };
    if (a.trigger === "event" && !a.eventName) return { ok: false, error: "Can't activate yet: choose a trigger event." };
  }
  a.status = a.status === "active" ? "paused" : "active";
  await a.save();
  revalidatePath("/automations");
  revalidatePath(`/automations/${id}`);
  return { ok: true, message: a.status === "active" ? "Automation is live." : "Automation paused." };
}

export async function deleteAutomationAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (isValidObjectId(id)) await Automation.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/automations");
  redirect("/automations");
}

// ── Events ────────────────────────────────────────────────
export async function createEventAction(_prev: AutoState, formData: FormData): Promise<AutoState> {
  const workspace = await ctx();
  const name = String(formData.get("name") ?? "").trim();
  if (!/^[a-z0-9_.:-]{1,80}$/i.test(name)) return { ok: false, error: "Use letters, numbers and . _ : - (max 80), e.g. user.signed_up" };
  try {
    await AutomationEvent.create({ workspaceId: workspace._id, name, description: String(formData.get("description") ?? "").slice(0, 300) });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { ok: false, error: `The event "${name}" already exists.` };
    throw e;
  }
  revalidatePath("/automations/events");
  return { ok: true, message: "Event created." };
}

export async function deleteEventAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (isValidObjectId(id)) await AutomationEvent.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/automations/events");
}

/** Fire an event for a contact from the dashboard (same path as POST /v1/events). */
export async function sendTestEventAction(_prev: AutoState, formData: FormData): Promise<AutoState> {
  const workspace = await ctx();
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const def = await AutomationEvent.findOneAndUpdate({ workspaceId: workspace._id, name }, { $inc: { received: 1 }, $set: { lastReceivedAt: new Date() } });
  if (!def) return { ok: false, error: "Event not found." };
  try {
    const { contact } = await upsertContact(workspace._id, { email, source: "dashboard" });
    const n = await runAutomations(workspace._id, contact, { type: "event", name, data: { source: "dashboard_test" } });
    revalidatePath("/automations/events");
    return { ok: true, message: n ? `Triggered — ${n} email${n === 1 ? "" : "s"} scheduled.` : "Event recorded. No active automation uses it yet." };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
