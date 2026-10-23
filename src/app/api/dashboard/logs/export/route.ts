import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiLog } from "@/lib/db/models";
import { toCsv } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const workspace = user ? await getActiveWorkspace(user) : null;
  if (!workspace) return new Response("Unauthorized", { status: 401 });
  await connectToDatabase();
  const rows = await ApiLog.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(200_000).select("method endpoint status source userAgent ip durationMs createdAt").lean();
  const csv = toCsv(["created_at", "method", "endpoint", "status", "source", "user_agent", "ip", "duration_ms"], rows.map((r) => [r.createdAt, r.method, r.endpoint, r.status, r.source, r.userAgent, r.ip, r.durationMs]));
  return new Response("﻿" + csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="logs-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
