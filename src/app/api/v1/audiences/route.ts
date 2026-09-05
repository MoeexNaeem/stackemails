import { authenticateApiRequest } from "@/lib/auth/apiAuth";
import { apiError, apiJson } from "@/lib/api/response";
import { createAudienceSchema } from "@/lib/validation/schemas";
import { Audience, Contact } from "@/lib/db/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/audiences
export async function POST(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  const parsed = createAudienceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", parsed.error.issues[0]?.message ?? "Invalid payload.");
  }

  const audience = await Audience.create({
    workspaceId: auth.workspace._id,
    name: parsed.data.name,
  });
  return apiJson({ id: String(audience._id), name: audience.name }, 201);
}

// GET /v1/audiences
export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);

  const audiences = await Audience.find({ workspaceId: auth.workspace._id })
    .sort({ createdAt: -1 })
    .lean();

  const withCounts = await Promise.all(
    audiences.map(async (a) => ({
      id: String(a._id),
      name: a.name,
      contact_count: await Contact.countDocuments({ audienceId: a._id }),
      created_at: a.createdAt,
    })),
  );
  return apiJson({ data: withCounts });
}
