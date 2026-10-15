import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation } from "@/lib/db/models";
import { AutomationsList, type AutomationView } from "@/components/dashboard/AutomationsList";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const automations = await Automation.find({ workspaceId: workspace._id })
    .sort({ updatedAt: -1 })
    .lean();

  const views: AutomationView[] = automations.map((a) => ({
    id: String(a._id),
    name: a.name,
    status: a.status,
    trigger: a.trigger,
    steps: a.steps?.length ?? 0,
    updatedAt: new Date(a.updatedAt).toISOString(),
  }));

  return <AutomationsList automations={views} />;
}
