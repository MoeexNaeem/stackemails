import type { Metadata } from "next";
import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, ApiLog } from "@/lib/db/models";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { RANGE_OPTIONS, escapeRegex, pageOf, rangeSince, PAGE_SIZE } from "@/lib/filters";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Logs" };

function StatusPill({ status }: { status: number }) {
  const color = status < 300 ? "var(--success)" : status >= 500 ? "var(--danger)" : "var(--warning)";
  return <span className="badge mono" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>{status}</span>;
}

const UA = [
  { value: "", label: "All user agents" },
  { value: "stackemails", label: "Stack Emails SDK" },
  { value: "node", label: "Node.js" },
  { value: "python", label: "Python" },
  { value: "curl", label: "cURL" },
  { value: "smtp", label: "SMTP relay" },
  { value: "mcp", label: "MCP" },
];

export default async function LogsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const filter: Record<string, unknown> = { workspaceId: workspace._id, createdAt: { $gte: rangeSince(sp.range) } };
  if (sp.status === "2xx") filter.status = { $gte: 200, $lt: 300 };
  if (sp.status === "4xx") filter.status = { $gte: 400, $lt: 500 };
  if (sp.status === "5xx") filter.status = { $gte: 500 };
  if (sp.ua && UA.some((u) => u.value === sp.ua)) filter.userAgent = { $regex: escapeRegex(sp.ua), $options: "i" };
  if (sp.key && isValidObjectId(sp.key)) filter.apiKeyId = sp.key;
  if (sp.q) filter.endpoint = { $regex: escapeRegex(sp.q.trim()), $options: "i" };
  const page = pageOf(sp.page);

  const [total, logs, keys] = await Promise.all([
    ApiLog.countDocuments(filter),
    ApiLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).select("endpoint method status source userAgent durationMs createdAt").lean(),
    ApiKey.find({ workspaceId: workspace._id }).select("name").lean(),
  ]);

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-6">Logs</h1>
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search endpoint…" },
          { type: "select", name: "range", defaultValue: "15d", options: RANGE_OPTIONS.map((o) => ({ value: o.value, label: o.label })) },
          { type: "select", name: "status", options: [{ value: "", label: "All statuses" }, { value: "2xx", label: "Success (2xx)" }, { value: "4xx", label: "Client errors (4xx)" }, { value: "5xx", label: "Server errors (5xx)" }] },
          { type: "select", name: "ua", options: UA },
          { type: "select", name: "key", options: [{ value: "", label: "All sources" }, ...keys.map((k) => ({ value: String(k._id), label: k.name }))] },
        ]}
      />
      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState icon="M3 5h18v14H3zM3 9h18M7 13h6" title="No logs yet" description="Every request to the Stack Emails API, SMTP relay and MCP server shows up here." />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Method</th>
                <th className="hidden md:table-cell">User agent</th>
                <th className="hidden sm:table-cell">Duration</th>
                <th className="text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={String(l._id)}>
                  <td className="mono text-[13px]"><Link href={`/logs/${l._id}`} className="hover:text-accent">{l.endpoint}</Link></td>
                  <td><StatusPill status={l.status} /></td>
                  <td className="mono text-fg-muted">{l.method}</td>
                  <td className="hidden md:table-cell max-w-[220px] truncate text-xs text-fg-subtle">{l.userAgent ?? l.source}</td>
                  <td className="hidden sm:table-cell text-fg-subtle">{l.durationMs != null ? `${l.durationMs}ms` : "—"}</td>
                  <td className="text-right text-fg-subtle whitespace-nowrap">{timeAgo(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
