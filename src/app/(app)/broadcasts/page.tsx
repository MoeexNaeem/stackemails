import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Broadcast } from "@/lib/db/models";
import { BroadcastsList, type BroadcastView } from "@/components/dashboard/BroadcastsList";

export const dynamic = "force-dynamic";

export default async function BroadcastsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const broadcasts = await Broadcast.find({ workspaceId: workspace._id })
    .sort({ updatedAt: -1 })
    .lean();

  const views: BroadcastView[] = broadcasts.map((b) => ({
    id: String(b._id),
    name: b.name,
    status: b.status,
    recipients: b.stats?.recipients ?? 0,
    updatedAt: new Date(b.updatedAt).toISOString(),
  }));

  return <BroadcastsList broadcasts={views} />;
}
