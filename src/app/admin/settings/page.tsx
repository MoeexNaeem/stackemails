import { requireAdmin } from "@/lib/auth/admin";
import { env } from "@/lib/env";
import { ProfileEmailForm } from "@/components/dashboard/ProfileEmailForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();

  const config = [
    { label: "Email provider", value: env.emailProvider },
    { label: "Queue driver", value: env.queueDriver },
    { label: "Rate-limit driver", value: env.rateLimitDriver },
    { label: "AWS region", value: env.aws.region },
    { label: "Database", value: env.mongoUri ? "MongoDB (external)" : "in-process" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Admin settings</h1>

      <div className="space-y-6 max-w-2xl">
        <div className="card p-5">
          <h2 className="font-semibold">Admin account</h2>
          <p className="text-sm text-fg-muted mt-1">Signed in as <strong>{admin.name}</strong> ({admin.email}).</p>
        </div>

        <ProfileEmailForm email={admin.email} />

        <div className="card p-5">
          <h2 className="font-semibold mb-3">Platform configuration</h2>
          <p className="text-sm text-fg-muted mb-4">Driven by environment variables (read-only).</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {config.map((c) => (
              <div key={c.label} className="rounded-lg px-4 py-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
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
