import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail } from "@/lib/api/route";
import { Contact, Segment } from "@/lib/db/models";
import { serializeSegment } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute<{ id: string }>({ endpoint: "/segments/:id" }, async ({ workspace, params }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Segment not found.");
  const s = await Segment.findOne({ _id: params.id, workspaceId: workspace._id }).lean();
  if (!s) apiFail(404, "not_found", "Segment not found.");
  const [contacts, unsubscribed] = await Promise.all([
    Contact.countDocuments({ workspaceId: workspace._id, segmentIds: s._id }),
    Contact.countDocuments({ workspaceId: workspace._id, segmentIds: s._id, unsubscribed: true }),
  ]);
  return { data: serializeSegment(s, { contacts, unsubscribed }) };
});

// Deleting a segment removes the membership, never the contacts themselves.
export const DELETE = apiRoute<{ id: string }>({ endpoint: "/segments/:id" }, async ({ workspace, params }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Segment not found.");
  const s = await Segment.findOneAndDelete({ _id: params.id, workspaceId: workspace._id });
  if (!s) apiFail(404, "not_found", "Segment not found.");
  await Contact.updateMany({ workspaceId: workspace._id, segmentIds: s._id }, { $pull: { segmentIds: s._id } });
  return { data: { object: "segment", id: String(s._id), deleted: true } };
});
