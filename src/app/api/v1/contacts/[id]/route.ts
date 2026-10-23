import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail } from "@/lib/api/route";
import { Contact, Segment, Topic } from "@/lib/db/models";
import { normalizeEmail } from "@/lib/contacts";
import { serializeContact } from "@/lib/api/serializers";
import { emitEvent } from "@/lib/webhooks/dispatch";
import type { WorkspaceDoc } from "@/lib/db/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Contacts can be addressed by id or by email. */
function contactFilter(workspace: WorkspaceDoc, idOrEmail: string) {
  const decoded = decodeURIComponent(idOrEmail);
  if (isValidObjectId(decoded)) return { workspaceId: workspace._id, _id: decoded };
  const email = normalizeEmail(decoded);
  if (!email) apiFail(422, "validation_error", "Pass a contact id or a valid email address.");
  return { workspaceId: workspace._id, email };
}

export const GET = apiRoute<{ id: string }>({ endpoint: "/contacts/:id" }, async ({ workspace, params }) => {
  const c = await Contact.findOne(contactFilter(workspace, params.id)).lean();
  if (!c) apiFail(404, "not_found", "Contact not found.");
  return { data: serializeContact(c) };
});

const patchSchema = z.object({
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  unsubscribed: z.boolean().optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  segment_ids: z.array(z.string()).max(50).optional(),
  topics: z.array(z.object({ topic_id: z.string(), subscription: z.enum(["opt_in", "opt_out"]) })).max(50).optional(),
});

export const PATCH = apiRoute<{ id: string }>({ endpoint: "/contacts/:id" }, async ({ workspace, params, body }) => {
  const input = await body(patchSchema);
  const c = await Contact.findOne(contactFilter(workspace, params.id));
  if (!c) apiFail(404, "not_found", "Contact not found.");

  if (input.first_name !== undefined) c.firstName = input.first_name;
  if (input.last_name !== undefined) c.lastName = input.last_name;
  if (input.unsubscribed !== undefined) {
    c.unsubscribed = input.unsubscribed;
    if (input.unsubscribed) c.unsubscribedAt = new Date();
  }
  if (input.properties) {
    const props = { ...(c.properties ?? {}) } as Record<string, unknown>;
    for (const [k, v] of Object.entries(input.properties)) {
      if (!/^[a-z][a-z0-9_]{0,49}$/.test(k)) apiFail(422, "validation_error", `Invalid property key: ${k}`);
      if (v === null) delete props[k];
      else props[k] = v;
    }
    c.properties = props;
    c.markModified("properties");
  }
  if (input.segment_ids) {
    const ids = input.segment_ids.filter(isValidObjectId);
    const n = await Segment.countDocuments({ _id: { $in: ids }, workspaceId: workspace._id });
    if (n !== ids.length || ids.length !== input.segment_ids.length) apiFail(404, "not_found", "One or more segment_ids don't exist.");
    c.segmentIds = ids as never;
  }
  if (input.topics) {
    const ids = input.topics.map((t) => t.topic_id).filter(isValidObjectId);
    const n = await Topic.countDocuments({ _id: { $in: ids }, workspaceId: workspace._id });
    if (n !== input.topics.length) apiFail(404, "not_found", "One or more topic_ids don't exist.");
    const next = new Map((c.topics ?? []).map((t) => [String(t.topicId), t.subscribed]));
    for (const t of input.topics) next.set(t.topic_id, t.subscription === "opt_in");
    c.topics = [...next].map(([topicId, subscribed]) => ({ topicId, subscribed })) as never;
  }
  await c.save();
  emitEvent(String(workspace._id), "contact.updated", serializeContact(c)).catch(() => {});
  return { data: serializeContact(c) };
});

export const DELETE = apiRoute<{ id: string }>({ endpoint: "/contacts/:id" }, async ({ workspace, params }) => {
  const c = await Contact.findOneAndDelete(contactFilter(workspace, params.id));
  if (!c) apiFail(404, "not_found", "Contact not found.");
  emitEvent(String(workspace._id), "contact.deleted", { id: String(c._id), email: c.email }).catch(() => {});
  return { data: { object: "contact", id: String(c._id), deleted: true } };
});
