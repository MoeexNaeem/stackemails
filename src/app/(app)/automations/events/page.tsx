import type { Metadata } from "next";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Automation, AutomationEvent } from "@/lib/db/models";
import { AutomationsHeader } from "@/components/automations/AutomationsHeader";
import { EventsManager } from "@/components/automations/EventsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Automation events" };

export default async function EventsPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const [events, autos] = await Promise.all([
    AutomationEvent.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean(),
    Automation.find({ workspaceId: workspace._id, trigger: "event" }).select("eventName status").lean(),
  ]);
  const usage = new Map<string, number>();
  for (const a of autos) usage.set(a.eventName ?? "", (usage.get(a.eventName ?? "") ?? 0) + 1);

  return (
    <div>
      <AutomationsHeader tab="events" action={<span />} />
      <EventsManager
        rows={events.map((e) => ({
          id: String(e._id),
          name: e.name,
          description: e.description ?? "",
          received: e.received ?? 0,
          lastReceivedAt: e.lastReceivedAt ? e.lastReceivedAt.toISOString() : null,
          automations: usage.get(e.name) ?? 0,
        }))}
      />
    </div>
  );
}
