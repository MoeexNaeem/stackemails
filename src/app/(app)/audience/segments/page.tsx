import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Contact, Segment } from "@/lib/db/models";
import { SegmentsManager } from "@/components/audience/SegmentsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Segments" };

export default async function SegmentsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const [segments, counts] = await Promise.all([
    Segment.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    Contact.aggregate([
      { $match: { workspaceId: workspace._id } },
      { $unwind: "$segmentIds" },
      { $group: { _id: "$segmentIds", contacts: { $sum: 1 }, unsubscribed: { $sum: { $cond: ["$unsubscribed", 1, 0] } } } },
    ]),
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c as { contacts: number; unsubscribed: number }]));
  return (
    <SegmentsManager
      rows={segments.map((s) => ({
        id: String(s._id),
        name: s.name,
        description: s.description ?? "",
        contacts: byId.get(String(s._id))?.contacts ?? 0,
        unsubscribed: byId.get(String(s._id))?.unsubscribed ?? 0,
        createdAt: s.createdAt.toISOString(),
      }))}
    />
  );
}
