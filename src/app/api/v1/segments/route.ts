import { z } from "zod";
import { apiRoute, apiFail } from "@/lib/api/route";
import { limitsFor } from "@/lib/plans";
import { Contact, Segment } from "@/lib/db/models";
import { serializeSegment } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = apiRoute({ endpoint: "/segments" }, async ({ workspace, body }) => {
  const { name, description } = await body(z.object({ name: z.string().trim().min(1).max(80), description: z.string().max(300).optional() }));
  const max = limitsFor(workspace.plan).segments;
  if ((await Segment.countDocuments({ workspaceId: workspace._id })) >= max) apiFail(403, "plan_limit", `Your plan allows ${max} segments.`);
  const s = await Segment.create({ workspaceId: workspace._id, name, description: description ?? "" });
  return { status: 201, data: serializeSegment(s) };
});

export const GET = apiRoute({ endpoint: "/segments" }, async ({ workspace }) => {
  const segs = await Segment.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean();
  const counts = await Contact.aggregate([
    { $match: { workspaceId: workspace._id } },
    { $unwind: "$segmentIds" },
    { $group: { _id: "$segmentIds", contacts: { $sum: 1 }, unsubscribed: { $sum: { $cond: ["$unsubscribed", 1, 0] } } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c]));
  return {
    data: {
      object: "list",
      data: segs.map((s) => serializeSegment(s, { contacts: byId.get(String(s._id))?.contacts ?? 0, unsubscribed: byId.get(String(s._id))?.unsubscribed ?? 0 })),
    },
  };
});
