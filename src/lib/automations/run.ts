import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation, Workspace, type ContactDoc } from "@/lib/db/models";
import { createAndQueueEmail } from "@/lib/email/send";
import { listUnsubscribeHeaders, propertiesFor, renderMergeTags, unsubscribeUrls } from "@/lib/contacts";

type Id = Types.ObjectId | string;
export type AutomationTrigger =
  | { type: "contact.added"; segmentIds?: Id[] }
  | { type: "event"; name: string; data?: Record<string, unknown> };

const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const;
const MAX_DELAY_MS = 30 * 86_400_000;

/**
 * Run every ACTIVE automation matching a trigger for one contact. Steps run in
 * order: wait steps accumulate a delay, email steps are scheduled at
 * now + accumulated delay (via the queue's delayed jobs). Only automations the
 * user explicitly activated fire, so imports never send unexpectedly.
 */
export async function runAutomations(workspaceId: Id, contact: ContactDoc, trigger: AutomationTrigger): Promise<number> {
  await connectToDatabase();
  if (contact.unsubscribed) return 0;

  const query: Record<string, unknown> = { workspaceId, status: "active" };
  if (trigger.type === "event") Object.assign(query, { trigger: "event", eventName: trigger.name });
  else query.trigger = "contact.added";

  const autos = await Automation.find(query).lean();
  if (!autos.length) return 0;
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return 0;
  const props = await propertiesFor(workspaceId);
  const urls = unsubscribeUrls(contact._id);

  const eventVars: Record<string, string> = {};
  if (trigger.type === "event") {
    for (const [k, v] of Object.entries(trigger.data ?? {})) {
      if (/^[a-z0-9_]{1,40}$/i.test(k) && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) {
        eventVars[`event.${k.toLowerCase()}`] = String(v).replace(/[<>&"]/g, "");
      }
    }
  }

  let scheduled = 0;
  for (const a of autos) {
    // Optional segment filter.
    if (a.audienceId) {
      const inSegment = (contact.segmentIds ?? []).some((s) => String(s) === String(a.audienceId)) ||
        (trigger.type === "contact.added" && trigger.segmentIds?.some((s) => String(s) === String(a.audienceId)));
      if (!inSegment) continue;
    }

    let delay = 0;
    for (const step of a.steps ?? []) {
      if (step.type === "wait") {
        delay += Math.max(0, Number(step.waitDuration ?? 0)) * (UNIT_MS[(step.waitUnit ?? "minutes") as keyof typeof UNIT_MS] ?? 60_000);
        continue;
      }
      if (step.type !== "email" || !step.from || !step.html) continue;
      if (delay > MAX_DELAY_MS) break; // beyond the scheduling horizon
      const extra = { unsubscribe_url: urls.page, ...eventVars };
      const res = await createAndQueueEmail(workspace, {
        from: step.from,
        to: [contact.email],
        subject: renderMergeTags(step.subject ?? "", contact, props, extra),
        html: renderMergeTags(step.html, contact, props, extra, { html: true }),
        headers: listUnsubscribeHeaders(contact._id),
        tags: [{ name: "automation_id", value: String(a._id) }],
        scheduledAt: delay > 0 ? new Date(Date.now() + delay) : null,
        source: "automation",
        contactId: contact._id,
      });
      if (res.ok) scheduled++;
    }
    await Automation.updateOne({ _id: a._id }, { $inc: { "stats.entered": 1, "stats.completed": 1 } });
  }
  return scheduled;
}

/** Back-compat wrapper used by contact creation paths. */
export async function runAutomationsForContact(workspaceId: Id, contact: ContactDoc, segmentIds?: Id[]) {
  return runAutomations(workspaceId, contact, { type: "contact.added", segmentIds });
}
