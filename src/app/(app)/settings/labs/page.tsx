import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { LabsToggles } from "@/components/settings/LabsToggles";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Labs" };

export default async function LabsPage() {
  const { workspace } = await requireDashboardContext();
  return <LabsToggles inboxes={workspace.labs?.inboxes !== false} assistant={workspace.labs?.assistant !== false} />;
}
