import { z } from "zod";
import { apiRoute, apiFail } from "@/lib/api/route";
import { EmailLog } from "@/lib/db/models";
import { getEmailQueue } from "@/lib/queue";
import { serializeEmail } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /v1/emails/:id - retrieve one email (tenant-scoped).
export const GET = apiRoute<{ id: string }>({ endpoint: "/emails/:id" }, async ({ workspace, params }) => {
  const log = await EmailLog.findOne({ workspaceId: workspace._id, messageId: params.id }).lean();
  if (!log) apiFail(404, "not_found", "Email not found.");
  return { data: serializeEmail(log, true) };
});

// PATCH /v1/emails/:id - reschedule a scheduled email. Body: { scheduled_at }
export const PATCH = apiRoute<{ id: string }>({ endpoint: "/emails/:id" }, async ({ workspace, params, body }) => {
  const { scheduled_at } = await body(z.object({ scheduled_at: z.string().datetime({ offset: true }) }));
  const when = new Date(scheduled_at);
  const delay = when.getTime() - Date.now();
  if (delay < 0) apiFail(422, "validation_error", "`scheduled_at` must be in the future.");
  if (delay > 30 * 86_400_000) apiFail(422, "validation_error", "Emails can be scheduled at most 30 days ahead.");

  const log = await EmailLog.findOneAndUpdate(
    { workspaceId: workspace._id, messageId: params.id, status: "scheduled" },
    { $set: { scheduledAt: when }, $push: { events: { type: "scheduled", at: new Date(), detail: `Rescheduled for ${when.toISOString()}` } } },
    { returnDocument: "after" },
  );
  if (!log) apiFail(409, "not_scheduled", "Only scheduled emails that haven't been sent can be rescheduled.");
  await getEmailQueue().enqueue({ emailId: String(log._id), workspaceId: String(workspace._id) }, { delayMs: delay, jobKey: String(when.getTime()) });
  return { data: { object: "email", id: log.messageId, status: log.status, scheduled_at: log.scheduledAt } };
});
