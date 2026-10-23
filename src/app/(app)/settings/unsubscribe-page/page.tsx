import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { UnsubscribeEditor } from "@/components/settings/UnsubscribeEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe page" };

export default async function UnsubscribePageSettings() {
  const { workspace } = await requireDashboardContext();
  const p: Partial<NonNullable<typeof workspace.unsubscribePage>> = workspace.unsubscribePage ?? {};
  return (
    <UnsubscribeEditor
      team={workspace.name}
      initial={{
        heading: p.heading || "Do you want to unsubscribe?",
        message: p.message || "Confirm your email preferences below.",
        confirmation: p.confirmation || "You've been unsubscribed. You won't receive these emails anymore.",
        brandColor: p.brandColor || "#15171a",
        showTopics: p.showTopics !== false,
      }}
    />
  );
}
