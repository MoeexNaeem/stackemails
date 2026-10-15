import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Suppression } from "@/lib/db/models";

export const dynamic = "force-dynamic";

const REASON_COLOR: Record<string, string> = {
  bounce: "var(--danger)",
  complaint: "var(--warning)",
  unsubscribe: "var(--fg-subtle)",
  manual: "var(--info)",
};

export default async function SuppressionsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const rows = await Suppression.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(200).lean();

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/emails" className="text-sm text-fg-muted hover:text-fg">← Emails</Link>
        <span className="text-fg-subtle">/</span>
        <h1 className="text-2xl font-semibold tracking-tight">Suppressions</h1>
      </div>
      <p className="text-sm text-fg-muted mb-6 max-w-2xl">
        NanoSend automatically stops sending to addresses that hard-bounce or mark your mail as spam.
        These recipients are suppressed to protect your sender reputation.
      </p>

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="font-medium">No suppressed addresses</p>
            <p className="text-sm text-fg-subtle mt-1">Bounced and complained recipients will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-fg-subtle border-b border-border">
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium text-right">Added</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r._id)} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">{r.email}</td>
                  <td className="px-5 py-3">
                    <span className="badge capitalize" style={{ color: REASON_COLOR[r.reason], background: `color-mix(in srgb, ${REASON_COLOR[r.reason]} 14%, transparent)` }}>
                      {r.reason}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-fg-subtle">{new Date(r.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
