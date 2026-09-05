import { authenticateApiRequest } from "@/lib/auth/apiAuth";
import { apiError, apiJson } from "@/lib/api/response";
import { createContactSchema } from "@/lib/validation/schemas";
import { Audience, Contact } from "@/lib/db/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/audiences/:id/contacts
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const { id } = await ctx.params;

  const audience = await Audience.findOne({ _id: id, workspaceId: auth.workspace._id });
  if (!audience) return apiError(404, "not_found", "Audience not found.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }
  const parsed = createContactSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", parsed.error.issues[0]?.message ?? "Invalid payload.");
  }

  try {
    const contact = await Contact.create({
      workspaceId: auth.workspace._id,
      audienceId: audience._id,
      email: parsed.data.email,
      firstName: parsed.data.first_name,
      lastName: parsed.data.last_name,
    });
    return apiJson({ id: String(contact._id), email: contact.email }, 201);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return apiError(409, "contact_exists", "That email is already in this audience.");
    }
    throw err;
  }
}

// GET /v1/audiences/:id/contacts
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);
  const { id } = await ctx.params;

  const contacts = await Contact.find({ workspaceId: auth.workspace._id, audienceId: id })
    .sort({ createdAt: -1 })
    .lean();

  return apiJson({
    data: contacts.map((c) => ({
      id: String(c._id),
      email: c.email,
      first_name: c.firstName ?? null,
      last_name: c.lastName ?? null,
      unsubscribed: c.unsubscribed,
      created_at: c.createdAt,
    })),
  });
}
