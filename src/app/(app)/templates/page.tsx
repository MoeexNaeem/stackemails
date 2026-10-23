import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { escapeRegex } from "@/lib/filters";
import { FilterBar } from "@/components/ui/FilterBar";
import { connectToDatabase } from "@/lib/db/connect";
import { Template } from "@/lib/db/models";
import { STARTER_TEMPLATES } from "@/lib/templates/starters";
import { createTemplateAction } from "@/app/(app)/actions";
import { MyTemplates, type TemplateView } from "@/components/dashboard/MyTemplates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (sp.q) filter.$or = [{ name: { $regex: escapeRegex(sp.q.trim()), $options: "i" } }, { subject: { $regex: escapeRegex(sp.q.trim()), $options: "i" } }];
  if (sp.category) filter.category = sp.category;
  const templates = await Template.find(filter).sort({ updatedAt: -1 }).lean();

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
          <h1 className="text-[28px] font-normal tracking-[-0.02em]">Templates</h1>
          <p className="mt-1 text-sm text-fg-muted">Design reusable emails with React Email or HTML.</p>
        </div>
        <form action={createTemplateAction}>
          <input type="hidden" name="starterId" value="blank" />
          <button type="submit" className="btn btn-primary">+ Create template</button>
        </form>
      </div>

      <FilterBar fields={[{ type: "search", name: "q", placeholder: "Search templates…" }, { type: "select", name: "category", options: [{ value: "", label: "All categories" }, { value: "Transactional", label: "Transactional" }, { value: "Marketing", label: "Marketing" }, { value: "custom", label: "Custom" }] }]} />
      <h2 className="text-sm font-medium text-fg-muted mb-3">Your templates</h2>
      <MyTemplates templates={views} />

      <h2 className="text-sm font-semibold text-fg-muted mt-10 mb-3">Start from a template</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STARTER_TEMPLATES.filter((s) => s.id !== "blank").map((s) => (
          <div key={s.id} className="card overflow-hidden">
            <div className="h-40 overflow-hidden border-b border-border bg-white">
              <iframe title={s.name} sandbox="" srcDoc={s.html} className="w-[200%] h-[320px] origin-top-left pointer-events-none" style={{ transform: "scale(0.5)" }} />
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
