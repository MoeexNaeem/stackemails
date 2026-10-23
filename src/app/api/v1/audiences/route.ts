import { z } from "zod";
import { apiRoute } from "@/lib/api/route";
import { Contact, Segment } from "@/lib/db/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Legacy: /v1/audiences is an alias of /v1/segments (kept for older SDKs).
export const POST = apiRoute({ endpoint: "/audiences" }, async ({ workspace, body }) => {
  const { name } = await body(z.object({ name: z.string().trim().min(1).max(80) }));
  const s = await Segment.create({ workspaceId: workspace._id, name });
  return { status: 201, data: { id: String(s._id), name: s.name } };
});

export const GET = apiRoute({ endpoint: "/audiences" }, async ({ workspace }) => {
  const segs = await Segment.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean();
  const data = await Promise.all(
    segs.map(async (s) => ({
      id: String(s._id),
      name: s.name,
      contact_count: await Contact.countDocuments({ workspaceId: workspace._id, segmentIds: s._id }),
      created_at: s.createdAt,
    })),
  );
  return { data: { data } };
});
