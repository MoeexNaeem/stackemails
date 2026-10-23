import { isValidObjectId } from "mongoose";
import type { z } from "zod";
import { apiFail } from "@/lib/api/route";
import { sendEmailSchema } from "@/lib/validation/schemas";
import { Domain, type ApiKeyDoc, type WorkspaceDoc } from "@/lib/db/models";
import { createAndQueueEmail } from "@/lib/email/send";
import { senderDomain } from "@/lib/email/guards";

/** Shared by single + batch send. */
export async function sendOne(
  workspace: WorkspaceDoc,
  apiKey: ApiKeyDoc,
  input: z.infer<typeof sendEmailSchema>,
  idempotencyKey?: string,
) {
  // Domain-scoped keys may only send from their domain.
  if (apiKey.domainScope && apiKey.domainScope !== "all" && isValidObjectId(apiKey.domainScope)) {
    const scoped = await Domain.findOne({ _id: apiKey.domainScope, workspaceId: workspace._id }).select("name").lean();
    const d = senderDomain(input.from);
    if (!scoped || !d || (d !== scoped.name && !d.endsWith(`.${scoped.name}`))) {
      apiFail(403, "restricted_api_key", `This API key can only send from ${scoped?.name ?? "its assigned domain"}.`);
    }
  }
  return createAndQueueEmail(workspace, {
    from: input.from,
    to: input.to,
    cc: input.cc,
    bcc: input.bcc,
    replyTo: input.reply_to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    headers: input.headers,
    attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.content_type })),
    tags: input.tags,
    scheduledAt: input.scheduled_at ? new Date(input.scheduled_at) : null,
    idempotencyKey,
    source: "api",
    apiKeyId: apiKey._id,
  });
}
