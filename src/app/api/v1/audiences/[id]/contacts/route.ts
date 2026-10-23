import { z } from "zod";
import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail } from "@/lib/api/route";
import { Contact, Segment } from "@/lib/db/models";
import { upsertContact } from "@/lib/contacts";
import { runAutomationsForContact } from "@/lib/automations/run";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { serializeContact } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Legacy: add a contact to a segment (formerly "audience").
export const POST = apiRoute<{ id: string }>({ endpoint: "/audiences/:id/contacts" }, async ({ workspace, params, body }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Audience not found.");
  const seg = await Segment.findOne({ _id: params.id, workspaceId: workspace._id }).lean();
  if (!seg) apiFail(404, "not_found", "Audience not found.");
  const input = await body(z.object({ email: z.string().email(), first_name: z.string().max(100).optional(), last_name: z.string().max(100).optional() }));
  const { contact, created } = await upsertContact(workspace._id, {
    email: input.email,
    firstName: input.first_name,
    lastName: input.last_name,
    segmentIds: [String(seg._id)],
    source: "api",
  });
  if (created) {
    emitEvent(String(workspace._id), "contact.created", serializeContact(contact)).catch(() => {});
    runAutomationsForContact(workspace._id, contact, [seg._id]).catch(() => {});
  }
  return { status: created ? 201 : 200, data: { id: String(contact._id), email: contact.email } };
});

export const GET = apiRoute<{ id: string }>({ endpoint: "/audiences/:id/contacts" }, async ({ workspace, params }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Audience not found.");
  const contacts = await Contact.find({ workspaceId: workspace._id, segmentIds: params.id }).sort({ createdAt: -1 }).limit(500).lean();
  return {
    data: {
      data: contacts.map((c) => ({ id: String(c._id), email: c.email, first_name: c.firstName || null, last_name: c.lastName || null, unsubscribed: !!c.unsubscribed, created_at: c.createdAt })),
    },
  };
});
