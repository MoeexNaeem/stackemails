import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Suppression } from "@/lib/db/models";
import { EmailsHeader } from "@/components/emails/EmailsHeader";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { SuppressionsManager } from "@/components/emails/SuppressionsManager";
import { escapeRegex, pageOf, PAGE_SIZE } from "@/lib/filters";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Suppressions" };

export default async function SuppressionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const filter: Record<string, unknown> = { workspaceId: workspace._id };
  if (sp.q) filter.email = { $regex: escapeRegex(sp.q.trim().toLowerCase()) };
  if (sp.reason && ["bounce", "complaint", "manual", "unsubscribe"].includes(sp.reason)) filter.reason = sp.reason;
  const page = pageOf(sp.page);
  const [total, rows] = await Promise.all([
    Suppression.countDocuments(filter),
    Suppression.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
  ]);

  return (
    <div>
      <EmailsHeader tab="suppressions" />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-normal">Suppressions</h2>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            Stack Emails automatically stops sending to addresses that hard-bounce or mark your mail as spam, protecting your sender reputation. Remove an address only if you&apos;re sure it&apos;s valid again.
          </p>
        </div>
      </div>
      <FilterBar
        fields={[
          { type: "search", name: "q", placeholder: "Search email…" },
          { type: "select", name: "reason", options: [{ value: "", label: "All reasons" }, { value: "bounce", label: "Bounce" }, { value: "complaint", label: "Complaint" }, { value: "manual", label: "Manual" }, { value: "unsubscribe", label: "Unsubscribe" }] },
        ]}
      />
      <SuppressionsManager rows={rows.map((r) => ({ id: String(r._id), email: r.email, reason: r.reason, createdAt: r.createdAt.toISOString() }))} />
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} />
    </div>
  );
}
