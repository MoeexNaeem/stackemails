import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Webhook, WebhookDelivery, WEBHOOK_EVENTS } from "@/lib/db/models";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CopyButton } from "@/components/CopyButton";
import { WebhooksManager, type WebhookView } from "@/components/dashboard/WebhooksManager";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();

  const [webhooks, deliveries] = await Promise.all([
    Webhook.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).lean(),
    WebhookDelivery.find({ workspaceId: workspace._id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const views: WebhookView[] = webhooks.map((w) => ({
    id: String(w._id),
    url: w.url,
    events: w.events,
    enabled: w.enabled,
    createdAt: new Date(w.createdAt).toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Receive signed, real-time events on your servers as emails move through their lifecycle."
      />

      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-sm">Signing secret</h2>
        <p className="text-sm text-fg-muted mt-1">
          Every payload includes an{" "}
          <code className="mono text-accent">X-NanoSend-Signature: sha256=…</code> header. Verify it
          with HMAC-SHA256 using this workspace secret.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <code
            className="mono text-sm flex-1 rounded-lg px-3 py-2 break-all"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}
          >
            {workspace.webhookSecret}
          </code>
          <CopyButton value={workspace.webhookSecret} />
        </div>
      </div>

      <WebhooksManager webhooks={views} allEvents={WEBHOOK_EVENTS} />

      {deliveries.length > 0 && (
        <div className="card overflow-hidden mt-8">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Recent deliveries</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {deliveries.map((d) => (
                <tr key={String(d._id)} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <StatusBadge status={d.status === "success" ? "delivered" : "failed"} />
                  </td>
                  <td className="px-5 py-3 mono text-fg-muted">{d.eventType}</td>
                  <td className="px-5 py-3 text-fg-subtle">
                    HTTP {d.responseStatus ?? "—"}
                    {d.durationMs != null ? ` · ${d.durationMs}ms` : ""}
                  </td>
                  <td className="px-5 py-3 text-right text-fg-subtle whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
