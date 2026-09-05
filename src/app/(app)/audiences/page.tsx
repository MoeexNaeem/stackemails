import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Audience, Contact } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AudiencesManager, type AudienceView } from "@/components/dashboard/AudiencesManager";

export const dynamic = "force-dynamic";

export default async function AudiencesPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const audiences = await Audience.find({ workspaceId: workspace._id })
    .sort({ createdAt: -1 })
    .lean();

  const views: AudienceView[] = await Promise.all(
    audiences.map(async (a) => ({
      id: String(a._id),
      name: a.name,
      contactCount: await Contact.countDocuments({ audienceId: a._id }),
      createdAt: new Date(a.createdAt).toISOString(),
    })),
  );

  return (
    <div>
      <PageHeader
        title="Audiences"
        description="Group contacts into audiences and send broadcasts to all of them at once."
      />
      <AudiencesManager audiences={views} />
    </div>
  );
}
