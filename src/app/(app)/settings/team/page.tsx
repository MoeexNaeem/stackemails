import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { roleIn } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { Invitation, Membership, User } from "@/lib/db/models";
import { TeamSettings } from "@/components/settings/TeamSettings";
import { limitsFor } from "@/lib/plans";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const { create } = await searchParams;
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const [memberships, invites, myRole] = await Promise.all([
    Membership.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    Invitation.find({ workspaceId: workspace._id, acceptedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).lean(),
    roleIn(user._id, workspace._id),
  ]);
  const users = await User.find({ _id: { $in: memberships.map((m) => m.userId) } }).select("email name mfaEnabled").lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return (
    <TeamSettings
      team={{ name: workspace.name, plan: workspace.plan, seats: limitsFor(workspace.plan).members }}
      me={{ id: String(user._id), role: myRole ?? "member" }}
      openCreate={create === "1"}
      members={memberships.map((m) => {
        const u = byId.get(String(m.userId));
        return { id: String(m._id), userId: String(m.userId), email: u?.email ?? "unknown", name: u?.name ?? "", role: m.role, mfa: !!u?.mfaEnabled, joined: m.createdAt.toISOString() };
      })}
      invites={invites.map((i) => ({ id: String(i._id), email: i.email, role: i.role, expiresAt: i.expiresAt.toISOString() }))}
    />
  );
}
