import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, ApiLog } from "@/lib/db/models";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log" };

function pretty(s?: string | null) {
  if (!s) return null;
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}

export default async function LogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const log = await ApiLog.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!log) notFound();
  const key = log.apiKeyId ? await ApiKey.findById(log.apiKeyId).select("name keyPrefix").lean() : null;
  const color = log.status < 300 ? "var(--success)" : log.status >= 500 ? "var(--danger)" : "var(--warning)";
  const req = pretty(log.requestBody);
  const res = pretty(log.responseBody);

  return (
    <div>
      <Link href="/logs" className="text-sm text-fg-subtle hover:text-fg">← Logs</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <span className="badge mono" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>{log.status}</span>
        <h1 className="mono text-xl">{log.method} {log.endpoint}</h1>
      </div>
      <div className="card mb-6 grid gap-5 p-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Created" value={new Date(log.createdAt).toLocaleString()} />
        <Meta label="Duration" value={log.durationMs != null ? `${log.durationMs} ms` : "—"} />
        <Meta label="API key" value={key ? `${key.name} (${key.keyPrefix}…)` : "—"} />
        <Meta label="Source" value={log.source} />
        <Meta label="User agent" value={log.userAgent ?? "—"} />
        <Meta label="IP" value={log.ip ?? "—"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Body title="Request body" body={req} />
        <Body title="Response body" body={res} />
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 truncate" title={value}>{value}</p>
    </div>
  );
}

function Body({ title, body }: { title: string; body: string | null }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <p className="text-sm font-medium">{title}</p>
        {body && <CopyButton value={body} className="!px-2 !py-1" />}
      </div>
      <pre className="mono max-h-[520px] overflow-auto p-5 text-xs leading-relaxed text-fg-muted">{body ?? "— empty —"}</pre>
    </div>
  );
}
