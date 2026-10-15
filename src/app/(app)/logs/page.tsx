import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiLog } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";

export const dynamic = "force-dynamic";

function StatusPill({ status }: { status: number }) {
  const ok = status >= 200 && status < 300;
  const color = ok ? "var(--success)" : status >= 500 ? "var(--danger)" : "var(--warning)";
  return (
    <span
      className="badge mono"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {status}
    </span>
  );
}

export default async function LogsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const logs = await ApiLog.find({ workspaceId: workspace._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return (
    <div>
      <PageHeader title="Logs" description="Every request made to the NanoSend API." />

      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input flex-1 min-w-[200px]" placeholder="Search..." />
        <span className="btn btn-secondary">Last 15 days ▾</span>
        <span className="btn btn-secondary">All statuses ▾</span>
        <span className="btn btn-secondary">All sources ▾</span>
      </div>

      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-fg-muted">No API requests yet.</p>
            <p className="text-sm text-fg-subtle mt-1">
              Requests to <code className="mono text-accent">/v1/*</code> will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Endpoint</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={String(l._id)} className="border-b border-border last:border-0 hover:bg-bg-hover">
                  <td className="px-5 py-3 mono">{l.endpoint}</td>
                  <td className="px-5 py-3">
                    <StatusPill status={l.status} />
                  </td>
                  <td className="px-5 py-3 mono text-fg-muted">{l.method}</td>
                  <td className="px-5 py-3 text-fg-muted capitalize">{l.source}</td>
                  <td className="px-5 py-3 text-right text-fg-subtle whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
