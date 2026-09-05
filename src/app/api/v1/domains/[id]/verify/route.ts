import { authenticateApiRequest } from "@/lib/auth/apiAuth";
import { apiError, apiJson } from "@/lib/api/response";
import { Domain } from "@/lib/db/models";
import { getEmailProvider } from "@/lib/email";
import { emitEvent } from "@/lib/webhooks/dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/domains/:id/verify — re-check verification status with the provider.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);

  const { id } = await ctx.params;
  const domain = await Domain.findOne({ _id: id, workspaceId: auth.workspace._id });
  if (!domain) return apiError(404, "not_found", "Domain not found.");

  const status = await getEmailProvider().getDomainStatus(domain.name, domain.region);
  const wasVerified = domain.status === "verified";
  domain.status = status;
  domain.lastCheckedAt = new Date();
  if (status === "verified") {
    domain.verifiedAt = domain.verifiedAt ?? new Date();
    domain.records.forEach((r) => {
      r.status = "verified";
    });
  }
  await domain.save();

  if (status === "verified" && !wasVerified) {
    await emitEvent(String(auth.workspace._id), "domain.verified", {
      domain_id: String(domain._id),
      name: domain.name,
    });
  }

  return apiJson({ id: String(domain._id), name: domain.name, status: domain.status });
}
