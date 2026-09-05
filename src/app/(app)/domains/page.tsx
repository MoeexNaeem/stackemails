import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { AddDomainForm } from "@/components/dashboard/AddDomainForm";
import { DomainCard, type DomainView } from "@/components/dashboard/DomainCard";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function DomainsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const domains = await Domain.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean();

  const views: DomainView[] = domains.map((d) => ({
    id: String(d._id),
    name: d.name,
    region: d.region,
    status: d.status,
    createdAt: new Date(d.createdAt).toISOString(),
    records: (d.records ?? []).map((r) => ({
      type: r.type,
      name: r.name,
      value: r.value,
      purpose: r.purpose,
      status: r.status,
    })),
  }));

  return (
    <div>
      <PageHeader
        title="Domains"
        description="Authenticate your sending domains with SPF + DKIM, delegated to Amazon SES."
        action={<AddDomainForm />}
      />

      {env.emailProvider === "mock" && (
        <div
          className="card p-4 mb-6 text-sm flex items-start gap-3"
          style={{ borderColor: "color-mix(in srgb, var(--info) 30%, transparent)" }}
        >
          <span style={{ color: "var(--info)" }}>ℹ</span>
          <p className="text-fg-muted">
            You’re in <strong>mock</strong> mode — clicking “Verify” succeeds instantly so you can
            explore the flow. Set <code className="mono text-accent">EMAIL_PROVIDER=ses</code> to
            verify real domains against AWS.
          </p>
        </div>
      )}

      {views.length === 0 ? (
        <div className="card px-5 py-16 text-center">
          <p className="text-fg-muted">No domains yet.</p>
          <p className="text-sm text-fg-subtle mt-1">
            Add a domain to start sending from your own address.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {views.map((d) => (
            <DomainCard key={d.id} domain={d} />
          ))}
        </div>
      )}
    </div>
  );
}
