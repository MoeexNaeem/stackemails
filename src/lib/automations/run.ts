import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation, EmailLog } from "@/lib/db/models";
import { getEmailQueue } from "@/lib/queue";
import { prefixedId } from "@/lib/ids";

/**
 * Run all ACTIVE automations triggered by a new contact. For each matching
 * automation, every email step is queued to the contact. (Wait steps are
 * acknowledged but not yet delayed — delayed scheduling lands with BullMQ
 * delayed jobs.) Only fires for automations the user explicitly activated, so
 * importing contacts never sends unexpectedly.
 */
export async function runAutomationsForContact(
  workspaceId: Types.ObjectId | string,
  contact: { email: string; audienceId: Types.ObjectId | string },
): Promise<void> {
  await connectToDatabase();
  const autos = await Automation.find({
    workspaceId,
    status: "active",
    trigger: "contact.added",
  }).lean();

  const queue = getEmailQueue();
  for (const a of autos) {
    if (a.audienceId && String(a.audienceId) !== String(contact.audienceId)) continue;

    for (const step of a.steps ?? []) {
      if (step.type !== "email" || !step.from) continue;
      const log = await EmailLog.create({
        workspaceId,
        messageId: prefixedId("msg"),
        from: step.from,
        to: [contact.email],
        subject: step.subject ?? "",
        html: step.html ?? "",
        status: "queued",
        events: [{ type: "queued", at: new Date() }],
      });
      await queue.enqueue({ emailId: String(log._id), workspaceId: String(workspaceId) });
    }
    await Automation.updateOne({ _id: a._id }, { $inc: { "stats.entered": 1 } });
  }
}
