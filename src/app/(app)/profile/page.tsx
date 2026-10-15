import { requireDashboardContext } from "@/lib/auth/context";
import { listWorkspacesForUser } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { Membership } from "@/lib/db/models";
import { ProfileEmailForm } from "@/components/dashboard/ProfileEmailForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user } = await requireDashboardContext();
  await connectToDatabase();
  const workspaces = await listWorkspacesForUser(user);
  const memberships = await Membership.find({ userId: user._id }).lean();
  const roleByWs = new Map(memberships.map((m) => [String(m.workspaceId), m.role]));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Profile</h1>

      <div className="space-y-6">
        <ProfileEmailForm email={user.email} />

        <div className="card p-5">
          <h2 className="font-semibold">Invites</h2>
          <p className="text-sm text-fg-muted mt-1">There are no pending invites.</p>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-3">Teams</h2>
          <p className="text-sm text-fg-muted mb-4">The teams that are associated with your account.</p>
          <div className="divide-y divide-border">
            {workspaces.map((w) => (
              <div key={String(w._id)} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff" }}>
                    {w.name.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium text-sm">{w.name}</p>
                    <p className="text-xs text-fg-subtle">Joined on {new Date(w.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className="badge capitalize" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>
                  {roleByWs.get(String(w._id)) ?? "member"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Authentication</h2>
          <p className="text-sm text-fg-muted mt-1">Link your account to third-party authentication providers.</p>
          <div className="flex items-center justify-between mt-4 py-3 border-t border-border">
            <div>
              <p className="font-medium text-sm">Email &amp; Password</p>
              <p className="text-xs text-fg-subtle">{user.email}</p>
            </div>
            <span className="text-xs text-fg-subtle">Connected</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-secondary">Link GitHub</button>
            <button className="btn btn-secondary">Link Google</button>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">Multi-factor authentication (MFA)</h2>
          <p className="text-sm text-fg-muted mt-1">Protect your account by adding an extra layer of security.</p>
          <button className="btn btn-secondary mt-3">Enable MFA</button>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold">OAuth apps</h2>
          <div className="py-8 text-center">
            <p className="font-medium">No authorized apps</p>
            <p className="text-sm text-fg-subtle mt-1">Third-party apps you authorize will appear here.</p>
          </div>
        </div>

        <div className="card p-5" style={{ borderColor: "color-mix(in srgb, var(--danger) 30%, transparent)" }}>
          <h2 className="font-semibold">Delete account</h2>
          <p className="text-sm text-fg-muted mt-1">Accounts can only be deleted when there are no more teams associated with it.</p>
          <button className="btn btn-danger mt-3">Delete account</button>
        </div>
      </div>
    </div>
  );
}
