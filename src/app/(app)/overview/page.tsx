import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog, Domain, ApiKey } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const wid = workspace._id;

  const [total, delivered, bounced, failed, domainCount, keyCount, recent] = await Promise.all([
    EmailLog.countDocuments({ workspaceId: wid }),
    EmailLog.countDocuments({ workspaceId: wid, status: "delivered" }),
    EmailLog.countDocuments({ workspaceId: wid, status: "bounced" }),
    EmailLog.countDocuments({ workspaceId: wid, status: "failed" }),
    Domain.countDocuments({ workspaceId: wid }),
    ApiKey.countDocuments({ workspaceId: wid, revokedAt: null }),
    EmailLog.find({ workspaceId: wid }).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const stats = [
    { label: "Emails sent", value: total.toLocaleString() },
    { label: "Delivery rate", value: `${deliveryRate}%` },
    { label: "Bounced", value: bounced.toLocaleString() },
    { label: "Failed", value: failed.toLocaleString() },
  ];

  const needsSetup = domainCount === 0 || keyCount === 0;

  return (
    <div>
      <PageHeader title="Overview" description="Your email activity at a glance." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-fg-muted">{s.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {needsSetup && (
        <div className="card p-6 mt-6">
          <h2 className="font-semibold">Get started in 3 steps</h2>
          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <Step done={keyCount > 0} n={1} />
              <span className={keyCount > 0 ? "text-fg-subtle line-through" : ""}>
                Create an API key
              </span>
              {keyCount === 0 && (
                <Link href="/api-keys" className="text-accent hover:underline ml-auto">
                  Create key →
                </Link>
              )}
            </li>
            <li className="flex items-center gap-3">
              <Step done={domainCount > 0} n={2} />
              <span className={domainCount > 0 ? "text-fg-subtle line-through" : ""}>
                Verify a sending domain
              </span>
              {domainCount === 0 && (
                <Link href="/domains" className="text-accent hover:underline ml-auto">
                  Add domain →
                </Link>
              )}
            </li>
            <li className="flex items-center gap-3">
              <Step done={total > 0} n={3} />
              <span className={total > 0 ? "text-fg-subtle line-through" : ""}>
                Send your first email
              </span>
              <Link href="/docs" className="text-accent hover:underline ml-auto">
                View docs →
              </Link>
            </li>
          </ol>
        </div>
      )}

      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Recent emails</h2>
          <Link href="/emails" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-fg-muted">No emails yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {recent.map((e) => (
                <tr key={String(e._id)} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <StatusBadge status={e.status} />
                  </td>
                  <td className="px-5 py-3 text-fg-muted truncate max-w-[200px]">
                    {e.to.join(", ")}
                  </td>
                  <td className="px-5 py-3 truncate max-w-[260px]">{e.subject}</td>
                  <td className="px-5 py-3 text-right text-fg-subtle whitespace-nowrap">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Step({ done, n }: { done: boolean; n: number }) {
  return (
    <span
      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
      style={{
        background: done ? "var(--success)" : "var(--bg-hover)",
        color: done ? "#04120a" : "var(--fg-muted)",
        border: done ? "none" : "1px solid var(--border-strong)",
      }}
    >
      {done ? "✓" : n}
    </span>
  );
}
