import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Webhook, WebhookDelivery } from "@/lib/db/models";
import { WebhookDetail } from "@/components/dashboard/WebhookDetail";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Webhook" };

export default async function WebhookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const w = await Webhook.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!w) notFound();
  const deliveries = await WebhookDelivery.find({ workspaceId: workspace._id, webhookId: w._id }).sort({ createdAt: -1 }).limit(50).lean();

  return (
    <div>
      <Link href="/webhooks" className="text-sm text-fg-subtle hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Webhooks</Link>
      <WebhookDetail
        webhook={{ id: String(w._id), url: w.url, enabled: w.enabled, events: w.events, createdAt: w.createdAt.toISOString() }}
        deliveries={deliveries.map((d) => ({
          id: String(d._id),
          eventId: d.eventId ?? "",
          eventType: d.eventType,
          status: d.status,
          attempts: d.attempts ?? 1,
          responseStatus: d.responseStatus ?? null,
          responseBody: d.responseBody ?? "",
          error: d.error ?? "",
          durationMs: d.durationMs ?? null,
          nextRetryAt: d.nextRetryAt ? d.nextRetryAt.toISOString() : null,
          createdAt: d.createdAt.toISOString(),
          payload: JSON.stringify(d.payload, null, 2),
        }))}
      />
    </div>
  );
}
