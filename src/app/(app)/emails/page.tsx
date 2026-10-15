import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain, EmailLog } from "@/lib/db/models";
import { StatusBadge } from "@/components/StatusBadge";
import { TestEmailComposer } from "@/components/dashboard/TestEmailComposer";
import { CodeDrawer } from "@/components/dashboard/CodeDrawer";

export const dynamic = "force-dynamic";

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const receiving = tab === "receiving";
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const verifiedDomain = await Domain.findOne({ workspaceId: workspace._id, status: "verified" }).lean();
  const logs = receiving
    ? []
    : await EmailLog.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(100).lean();

  const defaultFrom = verifiedDomain
    ? `Acme <hello@${verifiedDomain.name}>`
    : "Acme <onboarding@resend.dev>";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Emails</h1>
        <div className="flex items-center gap-2">
          <TestEmailComposer defaultFrom={defaultFrom} />
          <CodeDrawer resource="emails" />
        </div>
      </div>

      {/* Sending / Receiving tabs + Suppressions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          <Link href="/emails" className="tab" data-active={!receiving}>Sending</Link>
          <Link href="/emails?tab=receiving" className="tab" data-active={receiving}>Receiving</Link>
        </div>
        <Link href="/suppressions" className="btn btn-secondary">Suppressions</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input className="input flex-1 min-w-[200px]" placeholder="Search..." />
        <span className="btn btn-secondary">Last 15 days ▾</span>
        <span className="btn btn-secondary">All Statuses ▾</span>
        <span className="btn btn-secondary">All API keys ▾</span>
      </div>

      {receiving ? (
        <div className="card px-5 py-20 text-center">
          <p className="font-medium">Inbound email</p>
          <p className="text-sm text-fg-subtle mt-1 max-w-md mx-auto">
            Receiving email to your domain (with MX records) is coming soon. Emails sent to your
            verified domain will show up here.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {logs.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="text-fg-muted">No sent emails yet</p>
              <p className="text-sm text-fg-subtle mt-1">
                Use “Send test email”, or call <code className="mono text-accent">POST /v1/emails</code>.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-fg-subtle border-b border-border">
                    <th className="px-5 py-3 font-medium">To</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Subject</th>
                    <th className="px-5 py-3 font-medium text-right">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((e) => (
                    <tr key={String(e._id)} className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors">
                      <td className="px-5 py-3 text-fg-muted truncate max-w-[220px]">{e.to.join(", ")}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={e.status} />
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/emails/${e.messageId}`} className="hover:text-accent">{e.subject}</Link>
                      </td>
                      <td className="px-5 py-3 text-right text-fg-subtle whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
