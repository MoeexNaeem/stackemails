import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail } from "@/lib/api/route";
import { Broadcast, Segment, Topic } from "@/lib/db/models";
import { sendBroadcast } from "@/lib/broadcast";
import { serializeBroadcast } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().max(120).optional(),
  segment_id: z.string().optional(),
  audience_id: z.string().optional(), // legacy alias of segment_id (sends immediately)
  topic_id: z.string().optional(),
  from: z.string().min(3),
  reply_to: z.string().email().optional(),
  subject: z.string().min(1).max(998),
  preview_text: z.string().max(200).optional(),
  html: z.string().min(1),
  send: z.boolean().optional(),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
});

// POST /v1/broadcasts — create a broadcast; with send:true (or scheduled_at) it goes out right away.
export const POST = apiRoute({ endpoint: "/broadcasts" }, async ({ workspace, body }) => {
  const input = await body(createSchema);
  const segmentId = input.segment_id ?? input.audience_id;
  if (!segmentId || !isValidObjectId(segmentId)) apiFail(422, "validation_error", "`segment_id` is required.");
  const segment = await Segment.findOne({ _id: segmentId, workspaceId: workspace._id }).lean();
  if (!segment) apiFail(404, "not_found", "Segment not found.");
  if (input.topic_id) {
    if (!isValidObjectId(input.topic_id) || !(await Topic.exists({ _id: input.topic_id, workspaceId: workspace._id }))) apiFail(404, "not_found", "Topic not found.");
  }
  const scheduledAt = input.scheduled_at ? new Date(input.scheduled_at) : undefined;
  if (scheduledAt && scheduledAt.getTime() - Date.now() > 30 * 86_400_000) apiFail(422, "validation_error", "Broadcasts can be scheduled at most 30 days ahead.");

  const bc = await Broadcast.create({
    workspaceId: workspace._id,
    name: input.name || input.subject,
    audienceId: segment._id,
    topicId: input.topic_id,
    from: input.from,
    replyTo: input.reply_to ?? "",
    subject: input.subject,
    previewText: input.preview_text ?? "",
    html: input.html,
    scheduledAt,
  });

  const shouldSend = input.send || !!scheduledAt || (!!input.audience_id && input.send !== false);
  if (shouldSend) {
    const res = await sendBroadcast(bc);
    if (!res.ok) apiFail(422, "broadcast_not_sent", res.error);
    return { status: 202, data: { ...serializeBroadcast(bc), queued: res.queued, skipped: res.skipped } };
  }
  return { status: 201, data: serializeBroadcast(bc) };
});

export const GET = apiRoute({ endpoint: "/broadcasts" }, async ({ workspace }) => {
  const rows = await Broadcast.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(100).lean();
  return { data: { object: "list", data: rows.map(serializeBroadcast) } };
});
