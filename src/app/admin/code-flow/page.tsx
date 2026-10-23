import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const LIFECYCLE = [
  { step: "POST /v1/emails", file: "app/api/v1/emails/route.ts", desc: "Entry point for a send request" },
  { step: "authenticateApiRequest()", file: "lib/auth/apiAuth.ts", desc: "Verify API key, load workspace, check status" },
  { step: "sliding-window rate limit", file: "lib/ratelimit.ts", desc: "Per-key limiter (memory or Redis)" },
  { step: "validate payload (Zod)", file: "lib/validation/schemas.ts", desc: "Shape + required fields" },
  { step: "quota guard", file: "lib/quota.ts", desc: "Monthly + daily caps enforced" },
  { step: "EmailLog.create(queued)", file: "lib/db/models/EmailLog.ts", desc: "Persist the message, status = queued" },
  { step: "queue.enqueue(job)", file: "lib/queue/index.ts", desc: "In-process or BullMQ (Redis)" },
  { step: "processEmailJob()", file: "lib/email/dispatch.ts", desc: "Worker renders + sends" },
  { step: "provider.send()", file: "lib/email/providers/ses.ts", desc: "Amazon SES (SESv2)" },
  { step: "recordSend()", file: "lib/quota.ts", desc: "Increment usage counters" },
  { step: "emitEvent()", file: "lib/webhooks/dispatch.ts", desc: "Signed webhook to the tenant" },
  { step: "POST /api/webhooks/ses", file: "app/api/webhooks/ses/route.ts", desc: "SNS events → update status, suppress bounces" },
];

const LAYERS = [
  { name: "Presentation", items: ["Next.js App Router pages", "Tenant dashboard (app)", "Admin panel (admin)", "Tailwind design system"] },
  { name: "API / Edge", items: ["/v1/* REST routes", "withApi error wrapper", "ApiError typed errors", "SNS webhook receiver"] },
  { name: "Domain logic", items: ["email/dispatch (send pipeline)", "broadcast + automation engines", "quota + rate limiting", "webhooks/dispatch (HMAC)"] },
  { name: "Infrastructure", items: ["MongoDB (Mongoose models)", "Redis + BullMQ queue/worker", "Amazon SES + SNS", "Sessions + bcrypt auth"] },
];

export default async function AdminCodeFlowPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="text-[28px] font-normal tracking-[-0.02em] mb-2">Code Flow</h1>
      <p className="text-sm text-fg-muted mb-6">How a request moves through the system, and the layers behind it.</p>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Request lifecycle */}
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Request lifecycle — sending an email</h2>
          <ol className="relative">
            {LIFECYCLE.map((l, i) => (
              <li key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: "var(--accent)", color: "#fff" }}>{i + 1}</span>
                  {i < LIFECYCLE.length - 1 && <span className="w-px flex-1 mt-1" style={{ background: "var(--border-strong)" }} />}
                </div>
                <div className="pb-1">
                  <p className="text-sm font-medium mono">{l.step}</p>
                  <p className="text-xs text-fg-muted">{l.desc}</p>
                  <p className="text-[11px] text-fg-subtle mono">src/{l.file}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Architecture layers */}
        <div className="space-y-4 h-fit">
          {LAYERS.map((layer) => (
            <div key={layer.name} className="card p-4">
              <h3 className="font-semibold text-sm mb-2">{layer.name}</h3>
              <ul className="space-y-1 text-xs text-fg-muted">
                {layer.items.map((it) => <li key={it}>• {it}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
