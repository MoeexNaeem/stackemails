import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AddDomainForm } from "@/components/dashboard/AddDomainForm";
import { CodeDrawer } from "@/components/dashboard/CodeDrawer";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { escapeRegex } from "@/lib/filters";
import { timeAgo } from "@/lib/format";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Domains" };

export default async function DomainsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (sp.status && ["pending", "verified", "failed"].includes(sp.status)) filter.status = sp.status;
  if (sp.q) filter.name = { $regex: escapeRegex(sp.q.trim().toLowerCase()) };
  const domains = await Domain.find(filter).sort({ createdAt: -1 }).lean();

  return (
    <div>
      <PageHeader title="Domains" action={<><AddDomainForm /><CodeDrawer resource="domains" /></>} />
      {env.emailProvider === "mock" && (
        <p className="mb-4 rounded-xl px-4 py-2.5 text-sm text-fg-muted" style={{ background: "color-mix(in srgb, var(--info) 8%, transparent)" }}>
          Mock mode: verification succeeds instantly so you can explore. Set <code className="mono">EMAIL_PROVIDER=ses</code> to verify real domains.
        </p>
      )}
      <FilterBar fields={[{ type: "search", name: "q", placeholder: "Search domains…" }, { type: "select", name: "status", options: [{ value: "", label: "All statuses" }, { value: "verified", label: "Verified" }, { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }] }]} />
      <div className="card overflow-hidden">
        {domains.length === 0 ? (
          <EmptyState icon="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c3 3 3 17 0 20M12 2c-3 3-3 17 0 20" title={sp.q || sp.status ? "No domains match" : "No domains yet"} description="Verify a domain by adding DNS records and start sending and receiving emails from your own address.">
            <AddDomainForm />
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Region</th>
                <th className="hidden md:table-cell">Capabilities</th>
                <th className="text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={String(d._id)}>
                  <td><Link href={`/domains/${d._id}`} className="mono font-medium hover:text-accent">{d.name}</Link></td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="mono text-xs text-fg-muted">{d.region}</td>
                  <td className="hidden md:table-cell text-xs text-fg-muted">Sending{d.receivingEnabled ? " · Receiving" : ""}{d.openTracking || d.clickTracking ? " · Tracking" : ""}</td>
                  <td className="text-right text-fg-subtle">{timeAgo(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
