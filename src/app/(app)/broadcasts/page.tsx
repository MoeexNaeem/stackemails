import type { Metadata } from "next";
import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Broadcast, Segment } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { CodeDrawer } from "@/components/dashboard/CodeDrawer";
import { createBroadcastAction } from "@/app/(app)/actions";
import { escapeRegex } from "@/lib/filters";
import { pct, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Broadcasts" };

export default async function BroadcastsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (sp.status && ["draft", "scheduled", "sending", "sent"].includes(sp.status)) filter.status = sp.status;
  if (sp.segment && isValidObjectId(sp.segment)) filter.audienceId = sp.segment;
  if (sp.q) filter.$or = [{ name: { $regex: escapeRegex(sp.q.trim()), $options: "i" } }, { subject: { $regex: escapeRegex(sp.q.trim()), $options: "i" } }];
  const [rows, segments] = await Promise.all([
    Broadcast.find(filter).sort({ updatedAt: -1 }).limit(200).lean(),
    Segment.find({ workspaceId: workspace._id }).select("name").lean(),
  ]);
  const segName = new Map(segments.map((s) => [String(s._id), s.name]));

  const create = (
    <form action={createBroadcastAction}>
      <button className="btn btn-primary">+ Create broadcast</button>
    </form>
  );

  return (
    <div>
      <PageHeader title="Broadcasts" action={<>{create}<CodeDrawer resource="broadcasts" /></>} />
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search…" },
          { type: "select", name: "status", options: [{ value: "", label: "All statuses" }, { value: "draft", label: "Draft" }, { value: "scheduled", label: "Scheduled" }, { value: "sending", label: "Sending" }, { value: "sent", label: "Sent" }] },
          { type: "select", name: "segment", options: [{ value: "", label: "All segments" }, ...segments.map((s) => ({ value: String(s._id), label: s.name }))] },
        ]}
      />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M6 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" title="No broadcasts yet" description="Start reaching many recipients at once by creating and sending a broadcast.">
            {create}
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Segment</th>
                <th className="hidden md:table-cell">Recipients</th>
                <th className="hidden md:table-cell">Opened</th>
                <th className="text-right">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={String(b._id)}>
                  <td className="max-w-[300px] truncate"><Link href={`/broadcasts/${b._id}`} className="font-medium hover:text-accent">{b.name || "Untitled"}</Link><p className="truncate text-xs text-fg-subtle">{b.subject}</p></td>
                  <td><StatusBadge status={b.status} />{b.status === "scheduled" && b.scheduledAt && <p className="mt-1 text-[11px] text-fg-subtle">{new Date(b.scheduledAt).toLocaleString()}</p>}</td>
                  <td className="text-fg-muted">{b.audienceId ? segName.get(String(b.audienceId)) ?? "-" : "-"}</td>
                  <td className="hidden md:table-cell">{(b.stats?.recipients ?? 0).toLocaleString()}</td>
                  <td className="hidden md:table-cell text-fg-muted">{pct(b.stats?.opened ?? 0, b.stats?.recipients ?? 0)}</td>
                  <td className="text-right text-fg-subtle">{timeAgo(b.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
