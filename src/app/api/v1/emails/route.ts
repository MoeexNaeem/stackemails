import { authenticateApiRequest } from "@/lib/auth/apiAuth";
import { apiError, apiJson } from "@/lib/api/response";
import { getRateLimiter } from "@/lib/ratelimit";
import { sendEmailSchema } from "@/lib/validation/schemas";
import { EmailLog } from "@/lib/db/models";
import { prefixedId } from "@/lib/ids";
import { getEmailQueue } from "@/lib/queue";
import { logApiRequest } from "@/lib/apiLog";
import { sentToday } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/emails — queue an email for delivery.
export async function POST(req: Request) {
  const startedAt = Date.now();
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const { workspace, apiKey } = auth;

  // Sliding-window rate limit: 100 ingestion requests/sec per API key.
  const rl = await getRateLimiter().check(`emails:${apiKey._id}`, 100, 1000);
  if (!rl.allowed) {
    return apiError(429, "rate_limited", "Too many requests. Slow down.");
  }

  // Plan quota guards (monthly + daily).
  if ((workspace.usage?.sent ?? 0) >= workspace.monthlyQuota) {
    return apiError(429, "quota_exceeded", "Monthly send quota reached for this workspace.");
  }
  if (sentToday(workspace) >= workspace.dailyQuota) {
    return apiError(429, "quota_exceeded", "Daily send quota reached for this workspace.");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", parsed.error.issues[0]?.message ?? "Invalid payload.");
  }
  const input = parsed.data;

  // Idempotency: if the same key was seen before, return the original result.
  const idempotencyKey = req.headers.get("idempotency-key") ?? undefined;
  if (idempotencyKey) {
    const existing = await EmailLog.findOne({
      workspaceId: workspace._id,
      idempotencyKey,
    });
    if (existing) {
      logApiRequest({ workspace, req, endpoint: "/emails", status: 202, startedAt });
      return apiJson({ id: existing.messageId, status: existing.status }, 202);
    }
  }

  const log = await EmailLog.create({
    workspaceId: workspace._id,
    messageId: prefixedId("msg"),
    from: input.from,
    to: input.to,
    cc: input.cc ?? [],
    bcc: input.bcc ?? [],
    replyTo: input.reply_to ?? [],
    subject: input.subject,
    html: input.html,
    text: input.text,
    status: "queued",
    idempotencyKey,
    events: [{ type: "queued", at: new Date() }],
  });

  await getEmailQueue().enqueue({
    emailId: String(log._id),
    workspaceId: String(workspace._id),
  });

  logApiRequest({ workspace, req, endpoint: "/emails", status: 202, startedAt });
  return apiJson({ id: log.messageId, status: "queued" }, 202);
}

// GET /v1/emails — list recent emails for the workspace.
export async function GET(req: Request) {
  const startedAt = Date.now();
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 100);

  const logs = await EmailLog.find({ workspaceId: auth.workspace._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  logApiRequest({ workspace: auth.workspace, req, endpoint: "/emails", status: 200, startedAt });
  return apiJson({
    data: logs.map((l) => ({
      id: l.messageId,
      to: l.to,
      from: l.from,
      subject: l.subject,
      status: l.status,
      created_at: l.createdAt,
    })),
  });
}
