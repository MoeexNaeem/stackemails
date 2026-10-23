import { apiRoute, apiFail } from "@/lib/api/route";
import { createDomainSchema } from "@/lib/validation/schemas";
import { Domain } from "@/lib/db/models";
import { createDomain } from "@/lib/domains";
import { serializeDomain } from "@/lib/api/serializers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/domains — register a domain and return the DNS records to publish.
export const POST = apiRoute({ endpoint: "/domains" }, async ({ workspace, body }) => {
  const input = await body(createDomainSchema);
  const res = await createDomain(workspace._id, input);
  if (!res.ok) apiFail(res.status, res.code, res.message);
  return { status: 201, data: serializeDomain(res.domain, true) };
});

// GET /v1/domains — list domains.
export const GET = apiRoute({ endpoint: "/domains" }, async ({ workspace }) => {
  const rows = await Domain.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean();
  return { data: { object: "list", data: rows.map((d) => serializeDomain(d)) } };
});
