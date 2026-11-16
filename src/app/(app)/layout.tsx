import { sentThisPeriod } from "@/lib/quota";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace, listWorkspacesForUser } from "@/lib/auth/workspace";
import { Suspense } from "react";
import { AppShell } from "@/components/dashboard/AppShell";
import { VerifyEmailBanner } from "@/components/dashboard/VerifyEmailBanner";
import { isApprovedSender, isEmailVerified } from "@/lib/auth/verified";

// The dashboard is private: never index it.
export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Stack Emails" },
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [workspace, teams] = await Promise.all([getActiveWorkspace(user), listWorkspacesForUser(user)]);
  if (!workspace) redirect("/login");

  return (
    <AppShell
      teams={teams.map((t) => ({ id: String(t._id), name: t.name, plan: t.plan ?? "free" }))}
      activeTeamId={String(workspace._id)}
      user={{ name: user.name, email: user.email, isAdmin: user.platformRole === "admin" }}
      usage={{ sent: sentThisPeriod(workspace), quota: workspace.monthlyQuota }}
      assistantEnabled={workspace.labs?.assistant !== false}
    >
      <Suspense fallback={null}>
        <VerifyEmailBanner email={user.email} verified={isEmailVerified(user)} inReview={!isApprovedSender(user) && workspace.plan === "free"} />
      </Suspense>
      {children}
    </AppShell>
  );
}
