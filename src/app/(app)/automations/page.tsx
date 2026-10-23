import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation, Segment } from "@/lib/db/models";
import { AutomationsHeader } from "@/components/automations/AutomationsHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { createAutomationAction } from "@/app/(app)/automation-actions";
import { escapeRegex } from "@/lib/filters";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (sp.status && ["draft", "active", "paused"].includes(sp.status)) filter.status = sp.status;
  if (sp.q) filter.name = { $regex: escapeRegex(sp.q.trim()), $options: "i" };
  const [rows, segments] = await Promise.all([
    Automation.find(filter).sort({ updatedAt: -1 }).lean(),
    Segment.find({ workspaceId: workspace._id }).select("name").lean(),
  ]);
  const segName = new Map(segments.map((s) => [String(s._id), s.name]));

  return (
    <div>
      <AutomationsHeader tab="automations" />
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search automations…" },
          { type: "select", name: "status", options: [{ value: "", label: "All statuses" }, { value: "active", label: "Active" }, { value: "paused", label: "Paused" }, { value: "draft", label: "Draft" }] },
        ]}
      />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="M6 3v12a3 3 0 0 0 3 3h6M6 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" title={sp.q || sp.status ? "No automations match" : "No automations yet"} description="Automate your email sending with triggers, delays, and conditions.">
            <form action={createAutomationAction}><button className="btn btn-primary">+ Create automation</button></form>
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Trigger</th>
                <th>Steps</th>
                <th>Entered</th>
                <th className="text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={String(a._id)}>
                  <td><Link href={`/automations/${a._id}`} className="font-medium hover:text-accent">{a.name}</Link></td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="text-fg-muted">
                    {a.trigger === "event" ? <>Event <code className="mono text-xs">{a.eventName}</code></> : <>Contact added{a.audienceId ? ` to ${segName.get(String(a.audienceId)) ?? "segment"}` : ""}</>}
                  </td>
                  <td className="text-fg-muted">{a.steps?.length ?? 0}</td>
                  <td className="text-fg-muted">{(a.stats?.entered ?? 0).toLocaleString()}</td>
                  <td className="text-right text-fg-subtle">{timeAgo(a.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
