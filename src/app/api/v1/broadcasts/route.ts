import { authenticateApiRequest } from "@/lib/auth/apiAuth";
import { apiError, apiJson } from "@/lib/api/response";
import { createBroadcastSchema } from "@/lib/validation/schemas";
import { Audience } from "@/lib/db/models";
import { sendBroadcast } from "@/lib/broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/broadcasts — queue an email to every contact in an audience.
export async function POST(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  const parsed = createBroadcastSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", parsed.error.issues[0]?.message ?? "Invalid payload.");
  }

  const audience = await Audience.findOne({
    _id: parsed.data.audience_id,
    workspaceId: auth.workspace._id,
  });
  if (!audience) return apiError(404, "not_found", "Audience not found.");

  const { queued } = await sendBroadcast({
    workspaceId: auth.workspace._id,
    audienceId: parsed.data.audience_id,
    from: parsed.data.from,
    subject: parsed.data.subject,
    html: parsed.data.html,
    text: parsed.data.text,
  });

  return apiJson({ audience_id: parsed.data.audience_id, queued, status: "queued" }, 202);
}
