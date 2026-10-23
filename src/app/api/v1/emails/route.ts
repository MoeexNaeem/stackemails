import { apiRoute, apiFail, pageParams } from "@/lib/api/route";
import { sendEmailSchema } from "@/lib/validation/schemas";
import { EmailLog } from "@/lib/db/models";
import { sendOne } from "@/lib/email/apiSend";
import { serializeEmail } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/emails — validate, persist and queue an email.
export const POST = apiRoute({ endpoint: "/emails", sending: true, limit: 100 }, async ({ req, workspace, apiKey, body }) => {
  const input = await body(sendEmailSchema);
  const idem = req.headers.get("idempotency-key")?.slice(0, 256) || undefined;
  const result = await sendOne(workspace, apiKey, input, idem);
  if (!result.ok) apiFail(result.status, result.code, result.message);
  return { status: result.duplicate ? 200 : 202, data: { id: result.email.messageId, status: result.email.status, scheduled_at: result.email.scheduledAt ?? null } };
});

// GET /v1/emails — list emails, newest first. ?limit=1..100&after=<id>&status=
export const GET = apiRoute({ endpoint: "/emails" }, async ({ workspace, url }) => {
  const { limit, after } = pageParams(url);
  const status = url.searchParams.get("status");
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (status) filter.status = status;
  if (after) {
    const cursor = await EmailLog.findOne({ workspaceId: workspace._id, messageId: after }).select("createdAt").lean();
    if (cursor) filter.createdAt = { $lt: cursor.createdAt };
  }
  const rows = await EmailLog.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const page = rows.slice(0, limit);
  return { data: { object: "list", has_more: rows.length > limit, data: page.map((e) => serializeEmail(e)) } };
});
