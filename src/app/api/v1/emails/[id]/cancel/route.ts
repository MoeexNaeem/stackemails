import { apiRoute, apiFail } from "@/lib/api/route";
import { EmailLog } from "@/lib/db/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/emails/:id/cancel — cancel a scheduled email before it sends.
export const POST = apiRoute<{ id: string }>({ endpoint: "/emails/:id/cancel" }, async ({ workspace, params }) => {
  const log = await EmailLog.findOneAndUpdate(
    { workspaceId: workspace._id, messageId: params.id, status: "scheduled" },
    { $set: { status: "canceled" }, $unset: { attachmentBlobs: 1 }, $push: { events: { type: "canceled", at: new Date() } } },
    { returnDocument: "after" },
  );
  if (!log) apiFail(409, "not_scheduled", "Only scheduled emails that haven't been sent can be canceled.");
  return { data: { object: "email", id: log.messageId, status: "canceled" } };
});
