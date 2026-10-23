import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, Domain, EmailLog } from "@/lib/db/models";
import { Onboarding } from "@/components/dashboard/Onboarding";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  const [hasKey, domain, sent] = await Promise.all([
    ApiKey.exists({ workspaceId: workspace._id, revokedAt: { $exists: false } }),
    Domain.findOne({ workspaceId: workspace._id, status: "verified" }).select("name").lean(),
    EmailLog.exists({ workspaceId: workspace._id }),
  ]);
  return <Onboarding userEmail={user.email} hasKey={!!hasKey} verifiedDomain={domain?.name ?? null} hasSent={!!sent} teamName={workspace.name} />;
}
