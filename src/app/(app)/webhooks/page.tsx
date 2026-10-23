import type { Metadata } from "next";
import Link from "next/link";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Webhook, WebhookDelivery, WEBHOOK_EVENTS } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { AddWebhookButton, SigningSecret } from "@/components/dashboard/WebhooksManager";
import { CodeDrawer } from "@/components/dashboard/CodeDrawer";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const [webhooks, stats] = await Promise.all([
    Webhook.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean(),
    WebhookDelivery.aggregate([
      { $match: { workspaceId: workspace._id, createdAt: { $gte: new Date(Date.now() - 7 * 86_400_000) } } },
      { $group: { _id: "$webhookId", total: { $sum: 1 }, ok: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } }, last: { $max: "$createdAt" } } },
    ]),
  ]);
  const by = new Map(stats.map((s) => [String(s._id), s as { total: number; ok: number; last: Date }]));

  return (
    <div>
      <PageHeader title="Webhooks" description="Receive signed, real-time events on your servers as emails, contacts and domains change." action={<><AddWebhookButton events={[...WEBHOOK_EVENTS]} /><CodeDrawer resource="webhooks" /></>} />
      <SigningSecret secret={workspace.webhookSecret} />
      <div className="card overflow-hidden">
        {webhooks.length === 0 ? (
          <EmptyState icon="M13 10V3L4 14h7v7l9-11h-7z" title="No webhooks yet" description="Configure a webhook to receive real-time updates about email events.">
            <AddWebhookButton events={[...WEBHOOK_EVENTS]} />
          </EmptyState>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Events</th>
                <th className="hidden md:table-cell">Success (7d)</th>
                <th className="text-right">Last delivery</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => {
                const s = by.get(String(w._id));
                return (
                  <tr key={String(w._id)}>
                    <td className="max-w-[360px] truncate"><Link href={`/webhooks/${w._id}`} className="mono text-[13px] hover:text-accent">{w.url}</Link></td>
                    <td><StatusBadge status={w.enabled ? "active" : "paused"} /></td>
                    <td className="text-fg-muted">{w.events.length === 0 ? "All events" : `${w.events.length} event${w.events.length === 1 ? "" : "s"}`}</td>
                    <td className="hidden md:table-cell text-fg-muted">{s ? `${Math.round((s.ok / s.total) * 100)}% of ${s.total}` : "—"}</td>
                    <td className="text-right text-fg-subtle">{s ? timeAgo(s.last) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
