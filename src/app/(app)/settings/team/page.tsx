import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Membership, User } from "@/lib/db/models";
import { TeamNameForm } from "@/components/dashboard/TeamNameForm";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const memberships = await Membership.find({ workspaceId: workspace._id }).lean();
  const users = await User.find({ _id: { $in: memberships.map((m) => m.userId) } }).lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  const members = memberships.map((m) => ({
    id: String(m._id),
    email: byId.get(String(m.userId))?.email ?? "unknown",
    role: m.role,
    joined: new Date(m.createdAt),
  }));

  return (
    <div className="space-y-6">
      <TeamNameForm name={workspace.name} initialLetter={workspace.name.charAt(0).toUpperCase()} />

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Members</h2>
          <button className="btn btn-primary">Invite</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-fg-subtle border-b border-border">
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Enabled MFA</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <p className="font-medium">{m.email}</p>
                  <p className="text-xs text-fg-subtle">Joined on {m.joined.toLocaleDateString()}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="badge capitalize" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>
                    {m.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-fg-subtle">—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold">Exports</h2>
        <p className="text-sm text-fg-muted mt-1">All available CSV exports for your team are listed here.</p>
        <button className="btn btn-secondary mt-3">Go to page</button>
      </div>

      <div className="card p-5" style={{ borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)" }}>
        <h2 className="font-semibold">Delete team</h2>
        <p className="text-sm text-fg-muted mt-1">Permanently delete the team and all of its contents from NanoSend.</p>
        <button className="btn btn-danger mt-3">Delete team</button>
      </div>
    </div>
  );
}
