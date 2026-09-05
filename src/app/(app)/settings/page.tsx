import { requireDashboardContext } from "@/lib/auth/context";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CopyButton } from "@/components/CopyButton";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { user, workspace } = await requireDashboardContext();

  const config = [
    { label: "Email provider", value: env.emailProvider },
    { label: "Queue driver", value: env.queueDriver },
    { label: "Rate-limit driver", value: env.rateLimitDriver },
  ];

  return (
    <div>
      <PageHeader title="Settings" description="Workspace details and platform configuration." />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">Workspace</h2>
          <Field label="Name" value={workspace.name} />
          <Field label="Slug" value={workspace.slug} mono />
          <div>
            <p className="text-sm text-fg-subtle mb-1">Workspace ID</p>
            <div className="flex items-center gap-2">
              <code className="mono text-sm flex-1 truncate">{String(workspace._id)}</code>
              <CopyButton value={String(workspace._id)} className="!px-2 !py-1 text-xs" />
            </div>
          </div>
          <Field
            label="Monthly quota"
            value={`${(workspace.usage?.sent ?? 0).toLocaleString()} / ${workspace.monthlyQuota.toLocaleString()} sent`}
          />
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold">Account</h2>
          <Field label="Name" value={user.name} />
          <Field label="Email" value={user.email} />
        </div>

        <div className="card p-6 space-y-4 lg:col-span-2">
          <h2 className="font-semibold">Platform configuration</h2>
          <p className="text-sm text-fg-muted">
            These are driven by environment variables. In production, switch the provider to{" "}
            <code className="mono text-accent">ses</code> and the drivers to{" "}
            <code className="mono text-accent">bullmq</code> /{" "}
            <code className="mono text-accent">redis</code>.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {config.map((c) => (
              <div
                key={c.label}
                className="rounded-lg px-4 py-3"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs text-fg-subtle">{c.label}</p>
                <p className="mono text-sm mt-1 capitalize">{c.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-sm text-fg-subtle mb-1">{label}</p>
      <p className={mono ? "mono text-sm" : "text-sm"}>{value}</p>
    </div>
  );
}
