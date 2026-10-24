import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { systemStatus } from "@/lib/status";
import { FlowDiagram } from "@/components/admin/FlowDiagram";
import { Icon, type IconName } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Code flow" };

const LAYERS: { name: string; icon: IconName; items: string[] }[] = [
  { name: "Presentation", icon: "globe", items: ["Public site (SSR + ISR)", "Customer dashboard", "Admin panel", "Server actions for every mutation"] },
  { name: "API", icon: "server", items: ["/v1 REST routes (apiRoute wrapper)", "MCP server (JSON-RPC)", "SES and inbound SNS receivers", "Unsubscribe and tracking endpoints"] },
  { name: "Domain logic", icon: "layers", items: ["Send pipeline and guards", "Broadcasts and automations", "Quota, plans and rate limits", "Signed webhook deliveries"] },
  { name: "Infrastructure", icon: "database", items: ["MongoDB Atlas (Mongoose)", "Upstash Redis + BullMQ worker", "Amazon SES and SNS", "Sessions, bcrypt and TOTP"] },
];

export default async function AdminCodeFlowPage() {
  await requireAdmin();
  const status = await systemStatus();
  const color = { operational: "var(--success)", degraded: "var(--warning, #f59e0b)", down: "var(--danger)" } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-normal tracking-[-0.02em]">Code flow</h1>
          <p className="mt-1 text-sm text-fg-muted">How requests move through Stack Emails. Pick a flow, then click any step for the file, the logic and its failure modes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status.map((s) => (
            <span key={s.name} className="badge flex items-center gap-1.5" title={s.detail}>
              <span className="h-2 w-2 rounded-full" style={{ background: color[s.status] }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      <FlowDiagram />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {LAYERS.map((l) => (
          <div key={l.name} className="card p-5">
            <p className="flex items-center gap-2 text-sm font-medium"><Icon name={l.icon} size={16} style={{ color: "var(--violet)" }} /> {l.name}</p>
            <ul className="mt-3 space-y-2 text-[13px] text-fg-muted">
              {l.items.map((it) => (
                <li key={it} className="flex gap-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--fg-subtle)" }} />{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
