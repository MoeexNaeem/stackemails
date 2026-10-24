import { z } from "zod";
import { apiRoute, apiFail } from "@/lib/api/route";
import { AutomationEvent } from "@/lib/db/models";
import { upsertContact } from "@/lib/contacts";
import { runAutomations } from "@/lib/automations/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /v1/events - record a custom event for a contact and run every active
 * automation triggered by it. Body: { name, email, data? }
 * The contact is created if it doesn't exist yet.
 */
export const POST = apiRoute({ endpoint: "/events", sending: true, limit: 50 }, async ({ workspace, body }) => {
  const input = await body(
    z.object({
      name: z.string().regex(/^[a-z0-9_.:-]{1,80}$/i, "Event names may use letters, numbers, . _ : - (max 80)"),
      email: z.string().email(),
      data: z.record(z.string(), z.unknown()).optional(),
    }),
  );
  const def = await AutomationEvent.findOneAndUpdate(
    { workspaceId: workspace._id, name: input.name },
    { $inc: { received: 1 }, $set: { lastReceivedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!def) apiFail(404, "event_not_found", `Unknown event "${input.name}". Create it under Automations > Events first.`);

  const { contact } = await upsertContact(workspace._id, { email: input.email, source: "api" });
  const scheduled = await runAutomations(workspace._id, contact, { type: "event", name: input.name, data: input.data });
  return { status: 202, data: { object: "event", name: input.name, contact_id: String(contact._id), emails_scheduled: scheduled } };
});
