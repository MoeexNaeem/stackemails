import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { Suppression } from "@/lib/db/models";
import { toCsv } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const workspace = user ? await getActiveWorkspace(user) : null;
  if (!workspace) return new Response("Unauthorized", { status: 401 });
  await connectToDatabase();
  const rows = await Suppression.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(200_000).lean();
  const csv = toCsv(["email", "reason", "created_at"], rows.map((r) => [r.email, r.reason, r.createdAt]));
  return new Response("﻿" + csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="suppressions-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
