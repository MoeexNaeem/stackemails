import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ApiKeysManager, type KeyView } from "@/components/dashboard/ApiKeysManager";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const keys = await ApiKey.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean();

  const views: KeyView[] = keys.map((k) => ({
    id: String(k._id),
    name: k.name,
    mode: k.mode,
    last4: k.last4,
    lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
    createdAt: new Date(k.createdAt).toISOString(),
    revoked: Boolean(k.revokedAt),
  }));

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Authenticate requests to the NanoSend API. Keys are shown once — store them securely."
      />
      <ApiKeysManager keys={views} />
    </div>
  );
}
