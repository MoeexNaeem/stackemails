import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation, AutomationEvent, Domain, Segment, Template } from "@/lib/db/models";
import { AutomationEditor } from "@/components/automations/AutomationEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit automation" };

export default async function AutomationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const a = await Automation.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!a) notFound();
  const [segments, events, domains, templates] = await Promise.all([
    Segment.find({ workspaceId: workspace._id }).select("name").lean(),
    AutomationEvent.find({ workspaceId: workspace._id }).select("name").lean(),
    Domain.find({ workspaceId: workspace._id, status: "verified" }).select("name").lean(),
    Template.find({ workspaceId: workspace._id }).select("name subject html").limit(50).lean(),
  ]);

  return (
    <AutomationEditor
      id={String(a._id)}
      status={a.status}
      stats={{ entered: a.stats?.entered ?? 0, completed: a.stats?.completed ?? 0 }}
      initial={{
        name: a.name,
        trigger: a.trigger === "event" ? "event" : "contact.added",
        audienceId: a.audienceId ? String(a.audienceId) : "",
        eventName: a.eventName ?? "",
        steps: (a.steps ?? []).map((s) =>
          s.type === "wait"
            ? { type: "wait" as const, waitDuration: s.waitDuration ?? 1, waitUnit: (s.waitUnit ?? "days") as "minutes" | "hours" | "days" }
            : { type: "email" as const, from: s.from ?? "", subject: s.subject ?? "", html: s.html ?? "" },
        ),
      }}
      segments={segments.map((s) => ({ id: String(s._id), name: s.name }))}
      events={events.map((e) => e.name)}
      defaultFrom={domains[0] ? `${workspace.name} <hello@${domains[0].name}>` : ""}
      templates={templates.map((t) => ({ id: String(t._id), name: t.name, subject: t.subject ?? "", html: t.html ?? "" }))}
    />
  );
}
