import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail } from "@/lib/api/route";
import { Broadcast } from "@/lib/db/models";
import { sendBroadcast } from "@/lib/broadcast";
import { serializeBroadcast } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/broadcasts/:id/send - send (or schedule) a draft broadcast. Body: { scheduled_at? }
export const POST = apiRoute<{ id: string }>({ endpoint: "/broadcasts/:id/send" }, async ({ workspace, params, req, body }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Broadcast not found.");
  const hasBody = Number(req.headers.get("content-length") ?? 0) > 0;
  const input = hasBody ? await body(z.object({ scheduled_at: z.string().datetime({ offset: true }).optional() })) : {};
  const bc = await Broadcast.findOne({ _id: params.id, workspaceId: workspace._id });
  if (!bc) apiFail(404, "not_found", "Broadcast not found.");
  if (bc.status !== "draft") apiFail(409, "already_sent", `This broadcast is already ${bc.status}.`);
  if (input.scheduled_at) bc.scheduledAt = new Date(input.scheduled_at);
  const res = await sendBroadcast(bc);
  if (!res.ok) apiFail(422, "broadcast_not_sent", res.error);
  return { status: 202, data: { ...serializeBroadcast(bc), queued: res.queued, skipped: res.skipped } };
});
