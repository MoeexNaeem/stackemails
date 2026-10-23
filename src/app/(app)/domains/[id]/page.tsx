import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain } from "@/lib/db/models";
import { DomainDetail, type DomainDetailData } from "@/components/dashboard/DomainDetail";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Domain" };

export default async function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const d = await Domain.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!d) notFound();

  const data: DomainDetailData = {
    id: String(d._id),
    name: d.name,
    status: d.status,
    region: d.region,
    tlsMode: d.tlsMode ?? "opportunistic",
    clickTracking: !!d.clickTracking,
    openTracking: !!d.openTracking,
    receiving: !!d.receivingEnabled,
    createdAt: new Date(d.createdAt).toISOString(),
    lastCheckedAt: d.lastCheckedAt ? new Date(d.lastCheckedAt).toISOString() : null,
    records: (d.records ?? []).map((r) => ({ type: r.type, name: r.name, value: r.value, priority: r.priority ?? null, purpose: r.purpose, status: r.status })),
    events: (d.events ?? []).map((e) => ({ type: e.type, at: new Date(e.at).toISOString() })),
  };
  return <DomainDetail domain={data} />;
}
