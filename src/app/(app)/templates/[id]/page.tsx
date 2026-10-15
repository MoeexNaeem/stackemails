import { notFound } from "next/navigation";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Template } from "@/lib/db/models";
import { TemplateEditor } from "@/components/dashboard/TemplateEditor";

export const dynamic = "force-dynamic";

export default async function TemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireDashboardContext();
  const { id } = await params;
  await connectToDatabase();
  const t = await Template.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!t) notFound();

  return <TemplateEditor id={String(t._id)} name={t.name} subject={t.subject} html={t.html} />;
}
