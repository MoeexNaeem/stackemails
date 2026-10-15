import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, Domain } from "@/lib/db/models";
import { ApiKeysManager, type KeyView } from "@/components/dashboard/ApiKeysManager";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const [keys, domains] = await Promise.all([
    ApiKey.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean(),
    Domain.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean(),
  ]);

  const views: KeyView[] = keys.map((k) => ({
    id: String(k._id),
    name: k.name,
    mode: k.mode,
    keyPrefix: k.keyPrefix ?? "",
    last4: k.last4,
    permission: k.permission ?? "full_access",
    lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
    createdAt: new Date(k.createdAt).toISOString(),
    revoked: Boolean(k.revokedAt),
  }));

  const domainViews = domains.map((d) => ({ id: String(d._id), name: d.name }));

  return <ApiKeysManager keys={views} domains={domainViews} />;
}
