import { authenticateApiRequest } from "@/lib/auth/apiAuth";
import { apiError, apiJson } from "@/lib/api/response";
import { EmailLog } from "@/lib/db/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /v1/emails/:id — retrieve a single email by its public message id.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);

  const { id } = await ctx.params;
  const log = await EmailLog.findOne({
    workspaceId: auth.workspace._id, // tenant isolation
    messageId: id,
  }).lean();

  if (!log) return apiError(404, "not_found", "Email not found.");

  return apiJson({
    id: log.messageId,
    from: log.from,
    to: log.to,
    cc: log.cc,
    bcc: log.bcc,
    reply_to: log.replyTo,
    subject: log.subject,
    html: log.html,
    text: log.text,
    status: log.status,
    error: log.errorMessage ?? null,
    events: log.events,
    created_at: log.createdAt,
    sent_at: log.sentAt ?? null,
    delivered_at: log.deliveredAt ?? null,
  });
}
