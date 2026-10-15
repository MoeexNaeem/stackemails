import { notFound } from "next/navigation";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Broadcast, Audience, Contact } from "@/lib/db/models";
import { BroadcastEditor, type BroadcastEditorData } from "@/components/dashboard/BroadcastEditor";

export const dynamic = "force-dynamic";

export default async function BroadcastEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireDashboardContext();
  const { id } = await params;
  await connectToDatabase();

  const bc = await Broadcast.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!bc) notFound();

  const audiences = await Audience.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean();
  const audienceViews = await Promise.all(
    audiences.map(async (a) => ({
      id: String(a._id),
      name: a.name,
      contactCount: await Contact.countDocuments({ audienceId: a._id }),
    })),
  );

  const data: BroadcastEditorData = {
    id: String(bc._id),
    name: bc.name,
    status: bc.status,
    from: bc.from,
    replyTo: bc.replyTo,
    subject: bc.subject,
    previewText: bc.previewText,
    html: bc.html,
    design: bc.design ?? "",
    audienceId: bc.audienceId ? String(bc.audienceId) : "",
  };

  return <BroadcastEditor data={data} audiences={audienceViews} />;
}
