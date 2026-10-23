import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { escapeRegex } from "@/lib/filters";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, Domain } from "@/lib/db/models";
import { ApiKeysManager, type KeyView } from "@/components/dashboard/ApiKeysManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (sp.q) filter.name = { $regex: escapeRegex(sp.q.trim()), $options: "i" };
  if (sp.permission === "full_access" || sp.permission === "sending_access") filter.permission = sp.permission;
  const [keys, domains] = await Promise.all([
    ApiKey.find(filter).sort({ createdAt: -1 }).lean(),
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
