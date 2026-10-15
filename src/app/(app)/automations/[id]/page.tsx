import { notFound } from "next/navigation";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation } from "@/lib/db/models";
import { AutomationFlow } from "@/components/dashboard/AutomationFlow";

export const dynamic = "force-dynamic";

export default async function AutomationEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireDashboardContext();
  const { id } = await params;
  await connectToDatabase();

  const a = await Automation.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!a) notFound();

  return (
    <AutomationFlow
      id={String(a._id)}
      name={a.name}
      status={a.status}
      trigger={a.trigger}
      steps={(a.steps ?? []).map((s) => ({
        type: s.type,
        waitDuration: s.waitDuration ?? undefined,
        waitUnit: s.waitUnit ?? undefined,
        subject: s.subject ?? undefined,
      }))}
    />
  );
}
