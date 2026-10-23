import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { listWorkspacesForUser } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { Invitation, Membership, Session, Workspace } from "@/lib/db/models";
import { DeleteAccountForm, EmailForm, MfaCard, NameForm, PasswordForm, Section, SessionsCard } from "@/components/settings/AccountForms";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user } = await requireDashboardContext();
  await connectToDatabase();
  const [workspaces, memberships, sessions, invites] = await Promise.all([
    listWorkspacesForUser(user),
    Membership.find({ userId: user._id }).lean(),
    Session.countDocuments({ userId: user._id, expiresAt: { $gt: new Date() } }),
    Invitation.find({ email: user.email, acceptedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).lean(),
  ]);
  const roleByWs = new Map(memberships.map((m) => [String(m.workspaceId), m.role]));
  const inviteTeams = await Workspace.find({ _id: { $in: invites.map((i) => i.workspaceId) } }).select("name").lean();
  const teamName = new Map(inviteTeams.map((t) => [String(t._id), t.name]));

  return (
    <div>
      <h1 className="mb-6 text-[28px] font-normal tracking-[-0.02em]">Profile</h1>
      <div className="space-y-5">
        <Section title="Your name"><NameForm name={user.name} /></Section>
        <Section title="Email" desc="Used to sign in and for account notices. Changing it requires your password."><EmailForm email={user.email} /></Section>
        <Section title="Password"><PasswordForm /></Section>
        <Section title="Two-factor authentication" desc="Protect your account with a code from an authenticator app."><MfaCard enabled={!!user.mfaEnabled} /></Section>
        <Section title="Sessions" desc={user.lastLoginAt ? `Last sign-in ${timeAgo(user.lastLoginAt)}.` : undefined}><SessionsCard count={sessions} /></Section>
        <Section title="Invites">
          {invites.length === 0 ? (
            <p className="text-sm text-fg-muted">There are no pending invites.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((i) => (
                <li key={String(i._id)} className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                  <span>{teamName.get(String(i.workspaceId)) ?? "A team"} · <span className="capitalize text-fg-muted">{i.role}</span></span>
                  <span className="text-xs text-fg-subtle">Open the link in your email to accept</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Teams" desc="The teams associated with your account.">
          <ul className="divide-y divide-[var(--border)]">
            {workspaces.map((w) => (
              <li key={String(w._id)} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{w.name}</p>
                  <p className="text-xs text-fg-subtle">Created {new Date(w.createdAt).toLocaleDateString()} · {w.plan} plan</p>
                </div>
                <span className="badge capitalize" style={{ background: "var(--bg-hover)", color: "var(--fg-muted)" }}>{roleByWs.get(String(w._id)) ?? "member"}</span>
              </li>
            ))}
          </ul>
          <Link href="/settings/team?create=1" className="mt-3 inline-block text-sm text-accent hover:underline">+ Create team</Link>
        </Section>
        <Section title="Delete account" danger>
          {user.platformRole === "admin" ? <p className="text-sm text-fg-muted">Platform admin accounts can&apos;t be deleted from here.</p> : <DeleteAccountForm email={user.email} />}
        </Section>
      </div>
    </div>
  );
}
