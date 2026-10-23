import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Contact, Topic } from "@/lib/db/models";
import { TopicsManager } from "@/components/audience/TopicsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Topics" };

export default async function TopicsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const [topics, optOuts] = await Promise.all([
    Topic.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    Contact.aggregate([
      { $match: { workspaceId: workspace._id } },
      { $unwind: "$topics" },
      { $group: { _id: "$topics.topicId", in: { $sum: { $cond: ["$topics.subscribed", 1, 0] } }, out: { $sum: { $cond: ["$topics.subscribed", 0, 1] } } } },
    ]),
  ]);
  const by = new Map(optOuts.map((o) => [String(o._id), o as { in: number; out: number }]));
  return (
    <TopicsManager
      rows={topics.map((t) => ({
        id: String(t._id),
        name: t.name,
        description: t.description ?? "",
        defaultSubscribed: t.defaultSubscribed !== false,
        visibility: t.visibility,
        optedIn: by.get(String(t._id))?.in ?? 0,
        optedOut: by.get(String(t._id))?.out ?? 0,
      }))}
    />
  );
}
