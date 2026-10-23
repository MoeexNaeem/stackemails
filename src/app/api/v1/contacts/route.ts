import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail, pageParams } from "@/lib/api/route";
import { Contact, Segment } from "@/lib/db/models";
import { upsertContact } from "@/lib/contacts";
import { serializeContact } from "@/lib/api/serializers";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { runAutomationsForContact } from "@/lib/automations/run";
import { escapeRegex } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  email: z.string().email(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  unsubscribed: z.boolean().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  segment_ids: z.array(z.string()).max(50).optional(),
});

// POST /v1/contacts — create (or merge into) a contact.
export const POST = apiRoute({ endpoint: "/contacts" }, async ({ workspace, body }) => {
  const input = await body(createSchema);
  const segmentIds = (input.segment_ids ?? []).filter(isValidObjectId);
  if (segmentIds.length) {
    const n = await Segment.countDocuments({ _id: { $in: segmentIds }, workspaceId: workspace._id });
    if (n !== segmentIds.length) apiFail(404, "not_found", "One or more segment_ids don't exist.");
  }
  const { contact, created } = await upsertContact(workspace._id, {
    email: input.email,
    firstName: input.first_name,
    lastName: input.last_name,
    unsubscribed: input.unsubscribed,
    properties: input.properties ?? undefined,
    segmentIds,
    source: "api",
  });
  emitEvent(String(workspace._id), created ? "contact.created" : "contact.updated", serializeContact(contact)).catch(() => {});
  if (created) runAutomationsForContact(workspace._id, contact, segmentIds).catch(() => {});
  return { status: created ? 201 : 200, data: serializeContact(contact) };
});

// GET /v1/contacts — ?limit&after&segment_id&q&unsubscribed=true|false
export const GET = apiRoute({ endpoint: "/contacts" }, async ({ workspace, url }) => {
  const { limit, after } = pageParams(url);
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  const seg = url.searchParams.get("segment_id");
  if (seg) {
    if (!isValidObjectId(seg)) apiFail(422, "validation_error", "Invalid segment_id.");
    filter.segmentIds = seg;
  }
  const q = url.searchParams.get("q");
  if (q) filter.email = { $regex: escapeRegex(q.toLowerCase()) };
  const unsub = url.searchParams.get("unsubscribed");
  if (unsub === "true" || unsub === "false") filter.unsubscribed = unsub === "true";
  if (after && isValidObjectId(after)) filter._id = { $lt: after };

  const rows = await Contact.find(filter).sort({ _id: -1 }).limit(limit + 1).lean();
  return { data: { object: "list", has_more: rows.length > limit, data: rows.slice(0, limit).map(serializeContact) } };
});
