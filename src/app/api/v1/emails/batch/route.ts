import { z } from "zod";
import { apiRoute, apiFail } from "@/lib/api/route";
import { sendEmailSchema } from "@/lib/validation/schemas";
import { sendOne } from "@/lib/email/apiSend";
import { sentThisPeriod, sentToday } from "@/lib/quota";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const batchSchema = z.array(sendEmailSchema).min(1).max(100);

// POST /v1/emails/batch - send up to 100 emails in one request.
// Validation is all-or-nothing; each item is then queued independently.
export const POST = apiRoute({ endpoint: "/emails/batch", sending: true, limit: 20 }, async ({ req, workspace, apiKey, body }) => {
  const items = await body(batchSchema);
  if (items.some((i) => i.attachments?.length)) apiFail(422, "validation_error", "Attachments aren't supported in batch sends.");
  if (items.some((i) => i.scheduled_at)) apiFail(422, "validation_error", "`scheduled_at` isn't supported in batch sends.");

  // Queued emails only hit the usage counters once dispatched, so check the
  // whole batch against what's left up front.
  const units = items.reduce((n, i) => n + i.to.length + (i.cc?.length ?? 0) + (i.bcc?.length ?? 0), 0);
  if (sentThisPeriod(workspace) + units > workspace.monthlyQuota) apiFail(429, "quota_exceeded", "This batch would exceed your monthly send quota.");
  if (sentToday(workspace) + units > workspace.dailyQuota) apiFail(429, "quota_exceeded", "This batch would exceed your daily send quota.");

  const idem = req.headers.get("idempotency-key")?.slice(0, 200);
  const data: { id: string }[] = [];
  const errors: { index: number; code: string; message: string }[] = [];
  for (let i = 0; i < items.length; i++) {
    const r = await sendOne(workspace, apiKey, items[i], idem ? `${idem}:${i}` : undefined);
    if (r.ok) data.push({ id: r.email.messageId });
    else errors.push({ index: i, code: r.code, message: r.message });
  }
  if (data.length === 0) apiFail(errors[0]?.code === "quota_exceeded" ? 429 : 422, errors[0]?.code ?? "validation_error", errors[0]?.message ?? "No emails were queued.");
  return { status: 202, data: { data, errors } };
});
