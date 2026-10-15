import { requireDashboardContext } from "@/lib/auth/context";
import { CopyButton } from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage() {
  const { workspace } = await requireDashboardContext();
  const unsubscribeUrl = `https://nanosend.dev/unsubscribe/${workspace.slug}/{{contact_id}}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card p-6">
        <h2 className="font-semibold">Unsubscribe page</h2>
        <p className="text-sm text-fg-muted mt-1">
          NanoSend hosts a one-click unsubscribe page for your marketing emails, and adds the{" "}
          <code className="mono text-accent">List-Unsubscribe</code> header automatically so inboxes show a native unsubscribe button.
        </p>

        <div className="mt-5">
          <label className="label">Hosted unsubscribe URL</label>
          <div className="flex items-center gap-2">
            <code className="mono text-xs flex-1 rounded-lg px-3 py-2 break-all" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}>
              {unsubscribeUrl}
            </code>
            <CopyButton value={unsubscribeUrl} className="!px-2 !py-1.5" />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">Page content</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Heading</label>
            <input className="input" defaultValue="You've been unsubscribed" />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={3} defaultValue="You won't receive any more marketing emails from us. You can resubscribe at any time." />
          </div>
          <button className="btn btn-secondary">Save</button>
        </div>
      </div>
    </div>
  );
}
