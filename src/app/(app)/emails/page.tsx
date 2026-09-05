import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain, EmailLog } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { TestEmailComposer } from "@/components/dashboard/TestEmailComposer";

export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const [logs, verifiedDomain] = await Promise.all([
    EmailLog.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Domain.findOne({ workspaceId: workspace._id, status: "verified" }).lean(),
  ]);

  const defaultFrom = verifiedDomain
    ? `Acme <hello@${verifiedDomain.name}>`
    : "Acme <onboarding@resend.dev>";

  return (
    <div>
      <PageHeader
        title="Emails"
        description="Every email sent through your workspace, with real-time delivery status."
        action={<TestEmailComposer defaultFrom={defaultFrom} />}
      />

      <div className="card overflow-hidden">
        {logs.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-fg-muted">No emails sent yet.</p>
            <p className="text-sm text-fg-subtle mt-1">
              Use “Send test email”, or call{" "}
              <code className="mono text-accent">POST /v1/emails</code>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-fg-subtle border-b border-border">
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">To</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium text-right">Sent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((e) => (
                  <tr
                    key={String(e._id)}
                    className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors"
                  >
                    <td className="px-5 py-3">
                      <StatusBadge status={e.status} />
                    </td>
                    <td className="px-5 py-3 text-fg-muted truncate max-w-[220px]">
                      {e.to.join(", ")}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/emails/${e.messageId}`} className="hover:text-accent">
                        {e.subject}
                      </Link>
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
    </div>
  );
}
