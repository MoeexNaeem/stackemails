import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog } from "@/lib/db/models";
import { escapeRegex, rangeSince, toCsv } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV export of sent emails for the signed-in team, honouring the current filters. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const workspace = user ? await getActiveWorkspace(user) : null;
  if (!workspace) return new Response("Unauthorized", { status: 401 });
  await connectToDatabase();

  const sp = new URL(req.url).searchParams;
  const filter: Record<string, unknown> = { workspaceId: workspace._id, createdAt: { $gte: rangeSince(sp.get("range") ?? undefined) } };
  const q = sp.get("q");
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ to: rx }, { subject: rx }, { from: rx }];
  }
  if (sp.get("status")) filter.status = sp.get("status");
  const key = sp.get("key");
  if (key) {
    if (isValidObjectId(key)) filter.apiKeyId = key;
    else filter.source = key;
  }

  const rows: unknown[][] = [];
  for await (const e of EmailLog.find(filter).sort({ createdAt: -1 }).limit(100_000).select("messageId from to subject status source opens clicks createdAt sentAt deliveredAt").lean().cursor()) {
    rows.push([e.messageId, e.from, e.to.join("; "), e.subject, e.status, e.source, e.opens ?? 0, e.clicks ?? 0, e.createdAt, e.sentAt, e.deliveredAt]);
  }
  const csv = toCsv(["id", "from", "to", "subject", "status", "source", "opens", "clicks", "created_at", "sent_at", "delivered_at"], rows);
  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="emails-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
