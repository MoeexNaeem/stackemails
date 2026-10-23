import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ContactProperty } from "@/lib/db/models";
import { PropertiesManager } from "@/components/audience/PropertiesManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact properties" };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (type && ["string", "number", "boolean", "date"].includes(type)) filter.type = type;
  const rows = await ContactProperty.find(filter).sort({ createdAt: 1 }).lean();
  return (
    <PropertiesManager
      rows={rows.map((p) => ({ id: String(p._id), key: p.key, label: p.label, type: p.type, fallback: p.fallback ?? "", createdAt: p.createdAt.toISOString() }))}
    />
  );
}
