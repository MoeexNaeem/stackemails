import { sentThisPeriod } from "@/lib/quota";
import Link from "next/link";
import { isValidObjectId } from "mongoose";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import {
  Workspace, User, Subscription, Transaction, Plan,
  ApiKey, Domain, Contact, EmailLog, Membership, SupportTicket,
} from "@/lib/db/models";
import { setUserDisabledAction } from "@/app/admin/ops-actions";
import { timeAgo } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { WorkspaceAdminControls } from "@/components/admin/WorkspaceAdminControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team" };

function money(n: number) {
  return "$" + n.toLocaleString();
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectToDatabase();

  const ws = await Workspace.findById(id).lean();
  if (!ws) notFound();

  const [members, tickets] = await Promise.all([
    Membership.find({ workspaceId: id }).select("userId role").lean(),
    SupportTicket.find({ workspaceId: id }).sort({ lastActivityAt: -1 }).limit(8).select("number subject status lastActivityAt").lean(),
  ]);
  const memberUsers = await User.find({ _id: { $in: members.map((m) => m.userId) } }).select("name email disabled mfaEnabled lastLoginAt lastLoginIp platformRole").lean();
  const roleOf = new Map(members.map((m) => [String(m.userId), m.role]));

  const [owner, sub, plans, txns, keyCount, domainCount, contactCount, emailCount, revenueAgg] = await Promise.all([
    User.findById(ws.ownerId).lean(),
    Subscription.findOne({ workspaceId: id }).lean(),
    Plan.find({ isActive: true }).sort({ order: 1 }).lean(),
    Transaction.find({ workspaceId: id }).sort({ createdAt: -1 }).limit(12).lean(),
    ApiKey.countDocuments({ workspaceId: id }),
    Domain.countDocuments({ workspaceId: id }),
    Contact.countDocuments({ workspaceId: id }),
    EmailLog.countDocuments({ workspaceId: id }),
    Transaction.aggregate([{ $match: { workspaceId: ws._id, status: "paid" } }, { $group: { _id: null, sum: { $sum: "$amount" } } }]),
  ]);

  const lifetimeRevenue = revenueAgg[0]?.sum ?? 0;
  const renewal = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const renewed = renewal ? renewal.getTime() > Date.now() : false;

  const info: [string, React.ReactNode][] = [
    ["Owner", owner?.email ?? "—"],
    ["Owner name", owner?.name ?? "—"],
    ["Workspace ID", <code key="id" className="mono text-xs">{String(ws._id)}</code>],
    ["Plan", sub?.planName ?? ws.plan],
    ["Price", sub && sub.priceMonthly > 0 ? `$${sub.priceMonthly}/mo` : "Free"],
    ["Monthly usage", `${sentThisPeriod(ws).toLocaleString()} / ${ws.monthlyQuota.toLocaleString()}`],
    ["Daily limit", ws.dailyQuota.toLocaleString()],
    ["Joined", new Date(ws.createdAt).toLocaleDateString()],
    ["Billing email", ws.billingEmail || "—"],
  ];

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-fg-muted hover:text-fg">← Teams &amp; users</Link>

      <div className="flex items-center gap-3 mt-3 mb-6">
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">{ws.name}</h1>
        <StatusBadge status={ws.status === "active" ? "verified" : ws.status === "restricted" ? "pending" : "failed"} />
      </div>

      {ws.status === "restricted" && ws.restrictedReason && (
        <div className="card p-3 mb-6 text-sm" style={{ borderColor: "color-mix(in srgb, var(--warning) 30%, transparent)", color: "var(--warning)" }}>
          Restricted: {ws.restrictedReason}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Lifetime revenue", value: money(lifetimeRevenue) },
          { label: "Emails sent", value: emailCount.toLocaleString() },
          { label: "API keys", value: keyCount },
          { label: "Domains", value: domainCount },
          { label: "Contacts", value: contactCount.toLocaleString() },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-fg-subtle">{s.label}</p>
            <p className="mt-1 text-xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold mb-3">Details</h2>
            <div className="space-y-2.5 text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <span className="text-fg-subtle w-32 shrink-0">{k}</span>
                  <span className="min-w-0 break-words">{v}</span>
                </div>
              ))}
              <div className="flex gap-4">
                <span className="text-fg-subtle w-32 shrink-0">Renewal</span>
                <span>
                  {renewal ? (
                    <>
                      {renewal.toLocaleDateString()}{" "}
                      <span className="badge ml-1" style={{ color: renewed ? "var(--success)" : "var(--danger)", background: `color-mix(in srgb, ${renewed ? "var(--success)" : "var(--danger)"} 14%, transparent)` }}>
                        {renewed ? "Renewed / active" : "Expired"}
                      </span>
                      {sub?.autoRenew === false && <span className="text-fg-subtle"> · auto-renew off</span>}
                    </>
                  ) : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold">Members</h2></div>
            <div className="overflow-x-auto">
              <table className="table min-w-[620px]">
                <tbody>
                  {memberUsers.map((u) => (
                    <tr key={String(u._id)}>
                      <td>
                        <span className="font-medium">{u.name}</span>
                        <span className="block text-xs text-fg-subtle">{u.email}</span>
                      </td>
                      <td className="capitalize text-fg-muted">{roleOf.get(String(u._id))}</td>
                      <td className="text-xs text-fg-muted">
                        {u.mfaEnabled ? <span className="badge" style={{ color: "var(--success)" }}>2FA on</span> : <span className="badge">2FA off</span>}
                        {u.disabled && <span className="badge ml-1" style={{ color: "var(--danger)" }}>disabled</span>}
                      </td>
                      <td className="text-xs text-fg-subtle">{u.lastLoginAt ? `${timeAgo(u.lastLoginAt)}${u.lastLoginIp ? ` · ${u.lastLoginIp}` : ""}` : "never signed in"}</td>
                      <td className="text-right">
                        {String(u._id) !== String(admin._id) && (
                          <form action={setUserDisabledAction.bind(null, String(u._id), !u.disabled)}>
                            <button className={`btn btn-sm ${u.disabled ? "btn-secondary" : "btn-danger"}`}>{u.disabled ? "Enable" : "Disable"}</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold">Support tickets</h2></div>
            {tickets.length === 0 ? (
              <p className="px-5 py-8 text-center text-fg-muted text-sm">No tickets from this team.</p>
            ) : (
              <ul>
                {tickets.map((t) => (
                  <li key={String(t._id)} className="border-b border-border last:border-0">
                    <Link href={`/admin/support/${t._id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-bg-hover">
                      <span className="mono text-xs text-fg-subtle">#{t.number}</span>
                      <span className="min-w-0 flex-1 truncate">{t.subject}</span>
                      <span className="badge capitalize">{t.status}</span>
                      <span className="text-xs text-fg-subtle">{timeAgo(t.lastActivityAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-border"><h2 className="font-semibold">Transactions</h2></div>
            {txns.length === 0 ? (
              <p className="px-5 py-8 text-center text-fg-muted text-sm">No transactions.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {txns.map((t) => (
                    <tr key={String(t._id)} className="border-b border-border last:border-0">
                      <td className="px-5 py-3 capitalize">{t.type}</td>
                      <td className="px-5 py-3 text-fg-muted">{t.planName}</td>
                      <td className="px-5 py-3">{money(t.amount)}</td>
                      <td className="px-5 py-3"><StatusBadge status={t.status === "paid" ? "delivered" : "failed"} /></td>
                      <td className="px-5 py-3 text-right text-fg-subtle">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <WorkspaceAdminControls
          workspaceId={String(ws._id)}
          status={ws.status}
          currentPlanId={sub?.planId ? String(sub.planId) : ""}
          plans={plans.map((p) => ({ id: String(p._id), name: p.name, price: p.priceMonthly }))}
        />
      </div>
    </div>
  );
}
