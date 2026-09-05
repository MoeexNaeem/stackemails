import { authenticateApiRequest } from "@/lib/auth/apiAuth";
import { apiError, apiJson } from "@/lib/api/response";
import { createDomainSchema } from "@/lib/validation/schemas";
import { Domain } from "@/lib/db/models";
import { getEmailProvider } from "@/lib/email";
import { buildDnsRecords } from "@/lib/dns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /v1/domains — register a domain and return the DNS records to add.
export async function POST(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = createDomainSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(422, "validation_error", parsed.error.issues[0]?.message ?? "Invalid payload.");
  }
  const { name, region } = parsed.data;

  const existing = await Domain.findOne({ workspaceId: auth.workspace._id, name });
  if (existing) return apiError(409, "domain_exists", "Domain already registered.");

  const identity = await getEmailProvider().createDomainIdentity(name, region);
  const records = buildDnsRecords(name, identity.dkimTokens);

  const domain = await Domain.create({
    workspaceId: auth.workspace._id,
    name,
    region,
    status: "pending",
    records,
    awsIdentityArn: identity.arn,
    dkimTokens: identity.dkimTokens,
  });

  return apiJson(
    {
      id: String(domain._id),
      name: domain.name,
      status: domain.status,
      region: domain.region,
      records: domain.records,
    },
    201,
  );
}

// GET /v1/domains — list registered domains.
export async function GET(req: Request) {
  const auth = await authenticateApiRequest(req);
  if (!auth.ok) return apiError(auth.status, auth.code, auth.message);

  const domains = await Domain.find({ workspaceId: auth.workspace._id })
    .sort({ createdAt: -1 })
    .lean();

  return apiJson({
    data: domains.map((d) => ({
      id: String(d._id),
      name: d.name,
      status: d.status,
      region: d.region,
      created_at: d.createdAt,
    })),
  });
}
