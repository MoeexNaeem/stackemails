import { notFound } from "next/navigation";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain } from "@/lib/db/models";
import { DomainDetail, type DomainDetailData } from "@/components/dashboard/DomainDetail";

export const dynamic = "force-dynamic";

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { workspace } = await requireDashboardContext();
  const { id } = await params;
  await connectToDatabase();

  const d = await Domain.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!d) notFound();

  const data: DomainDetailData = {
    id: String(d._id),
    name: d.name,
    status: d.status,
    region: d.region,
    tlsMode: d.tlsMode ?? "opportunistic",
    clickTracking: d.clickTracking ?? true,
    openTracking: d.openTracking ?? false,
    createdAt: new Date(d.createdAt).toISOString(),
    records: (d.records ?? []).map((r) => ({
      type: r.type,
      name: r.name,
      value: r.value,
      purpose: r.purpose,
      status: r.status,
    })),
    events: (d.events ?? []).map((e) => ({ type: e.type, at: new Date(e.at).toISOString() })),
  };

  return <DomainDetail domain={data} />;
}
