import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { Membership, User } from "@/lib/db/models";
import { EmptyState } from "@/components/ui/EmptyState";
import { timeAgo } from "@/lib/format";
import { AccountReviewButtons } from "@/components/admin/AccountReviewButtons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account review" };

const FREEMAIL = /@(outlook|hotmail|live|msn|yahoo|gmail|googlemail|aol|gmx|mail|proton|protonmail|icloud|yandex)\./i;

export default async function AdminReviewPage() {
  await requireAdmin();
  await connectToDatabase();
  // Waiting: confirmed email, not approved, not disabled. Those who tried to add a domain first.
  const users = await User.find({
    platformRole: { $ne: "admin" },
    disabled: { $ne: true },
    sendingApprovedAt: null,
    $or: [{ emailVerifiedAt: { $ne: null } }, { googleId: { $ne: null } }],
  })
    .sort({ reviewRequestedAt: -1, createdAt: -1 })
    .limit(100)
    .select("email name createdAt emailVerifiedAt googleId reviewRequestedAt reviewDomain")
    .lean();
  const teamCounts = new Map<string, number>();
  for (const m of await Membership.aggregate<{ _id: unknown; n: number }>([
    { $match: { userId: { $in: users.map((u) => u._id) }, role: "owner" } },
    { $group: { _id: "$userId", n: { $sum: 1 } } },
  ])) teamCounts.set(String(m._id), m.n);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">Account review</h1>
        <p className="mt-1 text-sm text-fg-muted">
          New accounts can&apos;t add a sending domain until you approve them here (paying for a plan approves automatically). Approve when it looks like a real business:
          the domain has a real website, and the name and email match it. <strong>Warning signs:</strong> confirmed within a minute of signing up, a random-looking Outlook/Hotmail address,
          a name that doesn&apos;t match the email, or someone else&apos;s small-business domain.
        </p>
      </div>
      {users.length === 0 ? (
        <div className="card"><EmptyState title="Nobody waiting" description="Accounts that have confirmed their email and want to send appear here." /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[980px]">
            <thead>
              <tr><th>Account</th><th>Wants to add</th><th>Confirmed email</th><th>Teams</th><th>Signed up</th><th className="text-right">Decision</th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const secs = u.emailVerifiedAt ? Math.round((new Date(u.emailVerifiedAt).getTime() - new Date(u.createdAt).getTime()) / 1000) : null;
                const fast = secs !== null && secs < 120;
                const free = FREEMAIL.test(u.email);
                const digits = (u.email.split("@")[0].match(/\d/g) ?? []).length >= 4;
                return (
                  <tr key={String(u._id)}>
                    <td>
                      <p style={free && digits ? { color: "var(--danger)" } : undefined}>{u.email}</p>
                      <p className="text-xs text-fg-subtle">{u.name}</p>
                    </td>
                    <td>
                      {u.reviewDomain ? (
                        <a href={`https://${u.reviewDomain}`} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">{u.reviewDomain}</a>
                      ) : (
                        <span className="text-fg-subtle">-</span>
                      )}
                      {u.reviewRequestedAt && <p className="text-xs text-fg-subtle">{timeAgo(u.reviewRequestedAt)}</p>}
                    </td>
                    <td style={fast ? { color: "var(--danger)" } : undefined}>
                      {u.googleId ? "Google" : secs === null ? "-" : secs < 120 ? `${secs}s after signup` : `${Math.round(secs / 60)} min after signup`}
                    </td>
                    <td>{teamCounts.get(String(u._id)) ?? 0}</td>
                    <td className="text-fg-subtle">{timeAgo(u.createdAt)}</td>
                    <td className="text-right"><AccountReviewButtons userId={String(u._id)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-fg-subtle">Red = warning sign. Suspended accounts can be restored from <Link href="/admin/users" className="underline">Teams &amp; users</Link>.</p>
    </div>
  );
}
