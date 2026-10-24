import { isValidObjectId } from "mongoose";
import { apiRoute, apiFail } from "@/lib/api/route";
import { Domain } from "@/lib/db/models";
import { verifyDomain } from "@/lib/domains";
import { serializeDomain } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/domains/:id/verify - re-check DNS records and provider verification.
export const POST = apiRoute<{ id: string }>({ endpoint: "/domains/:id/verify" }, async ({ workspace, params }) => {
  if (!isValidObjectId(params.id)) apiFail(404, "not_found", "Domain not found.");
  const d = await Domain.findOne({ _id: params.id, workspaceId: workspace._id });
  if (!d) apiFail(404, "not_found", "Domain not found.");
  await verifyDomain(d);
  return { data: serializeDomain(d, true) };
});
