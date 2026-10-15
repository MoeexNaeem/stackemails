import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Template } from "@/lib/db/models";
import { STARTER_TEMPLATES } from "@/lib/templates/starters";
import { createTemplateAction } from "@/app/(app)/actions";
import { MyTemplates, type TemplateView } from "@/components/dashboard/MyTemplates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const templates = await Template.find({ workspaceId: workspace._id }).sort({ updatedAt: -1 }).lean();

  const views: TemplateView[] = templates.map((t) => ({
    id: String(t._id),
    name: t.name,
    subject: t.subject,
    category: t.category,
    html: t.html,
    updatedAt: new Date(t.updatedAt).toISOString(),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-fg-muted">Design reusable emails with React Email or HTML.</p>
        </div>
        <form action={createTemplateAction}>
          <input type="hidden" name="starterId" value="blank" />
          <button type="submit" className="btn btn-primary">+ Create template</button>
        </form>
      </div>

      <h2 className="text-sm font-semibold text-fg-muted mb-3">Your templates</h2>
      <MyTemplates templates={views} />

      <h2 className="text-sm font-semibold text-fg-muted mt-10 mb-3">Start from a template</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STARTER_TEMPLATES.filter((s) => s.id !== "blank").map((s) => (
          <div key={s.id} className="card overflow-hidden">
            <div className="h-40 overflow-hidden border-b border-border bg-white">
              <iframe title={s.name} srcDoc={s.html} className="w-[200%] h-[320px] origin-top-left pointer-events-none" style={{ transform: "scale(0.5)" }} />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-fg-subtle">{s.category}</p>
              </div>
              <form action={createTemplateAction}>
                <input type="hidden" name="starterId" value={s.id} />
                <button type="submit" className="btn btn-secondary">Use</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
