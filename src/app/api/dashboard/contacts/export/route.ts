import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { Contact, ContactProperty, Segment } from "@/lib/db/models";
import { escapeRegex, toCsv } from "@/lib/filters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV export of contacts for the signed-in team, honouring the current filters. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const workspace = await getActiveWorkspace(user);
  if (!workspace) return new Response("Unauthorized", { status: 401 });
  await connectToDatabase();

  const sp = new URL(req.url).searchParams;
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  const q = sp.get("q");
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
  }
  const seg = sp.get("segment");
  if (seg && isValidObjectId(seg)) filter.segmentIds = seg;
  if (sp.get("sub") === "subscribed") filter.unsubscribed = { $ne: true };
  if (sp.get("sub") === "unsubscribed") filter.unsubscribed = true;

  const [props, segments] = await Promise.all([
    ContactProperty.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    Segment.find({ workspaceId: workspace._id }).lean(),
  ]);
  const segName = new Map(segments.map((s) => [String(s._id), s.name]));
  const rows: unknown[][] = [];
  for await (const c of Contact.find(filter).sort({ createdAt: -1 }).limit(100_000).lean().cursor()) {
    const p = (c.properties ?? {}) as Record<string, unknown>;
    rows.push([
      c.email,
      c.firstName,
      c.lastName,
      c.unsubscribed ? "true" : "false",
      (c.segmentIds ?? []).map((s) => segName.get(String(s))).filter(Boolean).join("; "),
      ...props.map((pr) => p[pr.key]),
      c.createdAt,
    ]);
  }
  const csv = toCsv(["email", "first_name", "last_name", "unsubscribed", "segments", ...props.map((p) => p.key), "created_at"], rows);
  return new Response("﻿" + csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="contacts-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
