"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

type Lane = "client" | "api" | "queue" | "db" | "aws" | "tenant";
type Step = { lane: Lane; title: string; fn: string; file: string; what: string; fails: string };
type Flow = { id: string; name: string; summary: string; steps: Step[] };

const LANES: { id: Lane; name: string; icon: IconName; color: string }[] = [
  { id: "client", name: "Client", icon: "code", color: "#a39bff" },
  { id: "api", name: "API (Next.js)", icon: "server", color: "#b77fe0" },
  { id: "queue", name: "Queue & worker", icon: "layers", color: "#38bdf8" },
  { id: "db", name: "MongoDB", icon: "database", color: "#34d399" },
  { id: "aws", name: "Amazon SES / SNS", icon: "send", color: "#f59e0b" },
  { id: "tenant", name: "Customer app", icon: "webhook", color: "#c6f04f" },
];

const FLOWS: Flow[] = [
  {
    id: "send",
    name: "Send an email",
    summary: "A POST /v1/emails call, from API key to inbox, and the webhook that reports it.",
    steps: [
      { lane: "client", title: "POST /v1/emails", fn: "SDK / HTTP / SMTP relay / MCP", file: "src/app/api/v1/emails/route.ts", what: "The customer's code sends JSON with from, to, subject and html or text. The SMTP relay and MCP server call the same pipeline.", fails: "Malformed JSON returns 400 invalid_json." },
      { lane: "api", title: "Authenticate & rate limit", fn: "apiRoute() > authenticateApiRequest()", file: "src/lib/api/route.ts", what: "Looks up the hashed API key, checks the team is active and the key's scope, then applies a per-key sliding window (Redis).", fails: "401 invalid key, 403 restricted key or suspended team, 429 rate limited." },
      { lane: "api", title: "Validate & guard", fn: "sendEmailSchema + createAndQueueEmail()", file: "src/lib/email/send.ts", what: "Zod validation, verified sender domain, recipient limit, per-recipient quota, idempotency key and attachment size.", fails: "422 validation_error, 403 domain_not_verified, 429 quota_exceeded." },
      { lane: "db", title: "EmailLog: queued", fn: "EmailLog.create()", file: "src/lib/db/models/EmailLog.ts", what: "The message is persisted with status queued (or scheduled) and a msg_ id is returned to the caller with 202.", fails: "Duplicate idempotency key returns the original email with 200." },
      { lane: "queue", title: "Enqueue job", fn: "getEmailQueue().enqueue()", file: "src/lib/queue/index.ts", what: "A BullMQ job keyed by the email id, delayed for scheduled sends.", fails: "Redis down: the API still stored the email; the worker picks it up on reconnect." },
      { lane: "queue", title: "Worker processes job", fn: "processEmailJob()", file: "src/lib/email/dispatch.ts", what: "Re-checks sender and suppression list, applies the SES send rate, renders headers and attachments.", fails: "Transient errors retry up to 4 times; permanent errors mark the email failed." },
      { lane: "aws", title: "SES SendEmail", fn: "SesEmailProvider.send()", file: "src/lib/email/providers/ses.ts", what: "SESv2 signs the message with Easy DKIM (2048-bit) and delivers it.", fails: "Unverified identity or sandbox limits come back as permanent failures." },
      { lane: "db", title: "Status: sent", fn: "recordSend() + bumpStat()", file: "src/lib/quota.ts", what: "Usage counters increase per recipient and the daily stats rollup updates the dashboard charts.", fails: "Counters are best-effort and never block a send." },
      { lane: "tenant", title: "email.sent webhook", fn: "emitEvent()", file: "src/lib/webhooks/dispatch.ts", what: "A durable delivery is created for each subscribed endpoint and signed with HMAC-SHA256.", fails: "Endpoint errors are retried with backoff, see Delivery events." },
    ],
  },
  {
    id: "events",
    name: "Delivery events",
    summary: "What happens after SES delivers, bounces or receives a complaint.",
    steps: [
      { lane: "aws", title: "SES event to SNS", fn: "Configuration set event destination", file: "AWS console", what: "SES publishes Delivery, Bounce, Complaint, Open and Click events to an SNS topic.", fails: "Requires SES_CONFIGURATION_SET with an SNS destination." },
      { lane: "api", title: "POST /api/webhooks/ses", fn: "verifySnsMessage()", file: "src/lib/aws/sns.ts", what: "Validates the SNS signature against AWS's certificate and confirms subscriptions (host-checked).", fails: "Unsigned or forged notifications are rejected with 403." },
      { lane: "db", title: "Update EmailLog", fn: "SES webhook handler", file: "src/app/api/webhooks/ses/route.ts", what: "Sets delivered, bounced or complained and appends to the email's event timeline.", fails: "Unknown message ids are acknowledged and ignored." },
      { lane: "db", title: "Suppress bad addresses", fn: "Suppression.updateOne()", file: "src/app/api/webhooks/ses/route.ts", what: "Permanent bounces and complaints add only the affected recipients to the team's suppression list.", fails: "Transient bounces are never suppressed." },
      { lane: "queue", title: "Queue webhook delivery", fn: "getWebhookQueue().enqueue()", file: "src/lib/queue/webhooks.ts", what: "One delivery per endpoint subscribed to the event type.", fails: "Disabled or deleted endpoints are marked failed." },
      { lane: "queue", title: "Signed POST with retries", fn: "attemptDelivery()", file: "src/lib/webhooks/dispatch.ts", what: "Sends v1 and timestamped v2 signatures; SSRF-checked on every attempt. Retries at 30s, 2m, 10m, 1h and 6h.", fails: "After 6 attempts the delivery is failed and can be redelivered from the dashboard." },
      { lane: "tenant", title: "Customer endpoint", fn: "verifyWebhook()", file: "packages/nanosend/src/webhooks.ts", what: "The customer verifies the signature with the SDK and updates their own records.", fails: "Any non-2xx or timeout over 10 seconds counts as a failed attempt." },
    ],
  },
  {
    id: "inbound",
    name: "Inbound email",
    summary: "Mail sent to a team's receiving address or verified domain.",
    steps: [
      { lane: "client", title: "Someone emails support@", fn: "MX *.in.stackemails.com", file: "DNS", what: "A wildcard MX record routes mail for every team's receiving address to SES.", fails: "Without the MX record mail bounces at the sender." },
      { lane: "aws", title: "SES receipt rule", fn: "SES receiving + SNS", file: "AWS console", what: "SES runs spam and virus checks and publishes the raw message to SNS.", fails: "Messages over SES limits are rejected upstream." },
      { lane: "api", title: "POST /api/inbound/ses", fn: "verifySnsMessage()", file: "src/app/api/inbound/ses/route.ts", what: "Verifies the SNS signature and optional topic allowlist.", fails: "Unverified notifications return 403." },
      { lane: "api", title: "Parse & route", fn: "ingestInbound()", file: "src/lib/inbound.ts", what: "mailparser extracts headers, bodies and attachments, then resolves the team and inbox from the recipient.", fails: "Unknown recipients are dropped." },
      { lane: "db", title: "InboundEmail + thread", fn: "InboundEmail.create()", file: "src/lib/db/models/InboundEmail.ts", what: "Stored with spam and virus verdicts and threaded into the inbox conversation.", fails: "Flagged messages show a warning in the dashboard." },
      { lane: "tenant", title: "email.received webhook", fn: "emitEvent()", file: "src/lib/webhooks/dispatch.ts", what: "The customer's app receives the parsed message metadata.", fails: "Retried like every other webhook." },
    ],
  },
  {
    id: "broadcast",
    name: "Broadcast",
    summary: "Sending a campaign to a segment.",
    steps: [
      { lane: "client", title: "Send broadcast", fn: "Dashboard or POST /v1/broadcasts", file: "src/app/api/v1/broadcasts/route.ts", what: "A broadcast targets a segment, optionally filtered by subscription topic, now or scheduled.", fails: "Unverified sender domain blocks sending." },
      { lane: "api", title: "Resolve audience", fn: "sendBroadcast()", file: "src/lib/broadcast.ts", what: "Loads subscribed contacts in the segment, skips unsubscribed, suppressed and topic opt-outs, and checks quota for the whole run.", fails: "422 broadcast_not_sent when the quota cannot cover it." },
      { lane: "api", title: "Personalise", fn: "renderMergeTags() + listUnsubscribeHeaders()", file: "src/lib/contacts.ts", what: "Merge tags with fallbacks, RFC 8058 one-click unsubscribe headers and a footer link per contact.", fails: "Missing properties use their fallback values." },
      { lane: "db", title: "One EmailLog per contact", fn: "createAndQueueEmail()", file: "src/lib/email/send.ts", what: "Each recipient becomes a tracked email linked to the broadcast.", fails: "Stats refresh as events arrive." },
      { lane: "queue", title: "Worker sends at SES rate", fn: "processEmailJob()", file: "src/lib/email/dispatch.ts", what: "Jobs drain at SES_MAX_SEND_RATE so the account never exceeds its limit.", fails: "Throttled sends retry automatically." },
      { lane: "aws", title: "Delivered", fn: "SESv2", file: "src/lib/email/providers/ses.ts", what: "Delivery, open and click events flow back through the events pipeline.", fails: "Bounces feed the suppression list." },
    ],
  },
  {
    id: "auth",
    name: "Dashboard sign-in",
    summary: "Email and password, optional two-factor, then a session cookie.",
    steps: [
      { lane: "client", title: "POST /api/auth/login", fn: "AuthForm", file: "src/components/AuthForm.tsx", what: "The browser sends email and password over HTTPS.", fails: "Shows the error inline and as a toast." },
      { lane: "api", title: "Rate limit & verify", fn: "login route", file: "src/app/api/auth/login/route.ts", what: "Per-IP and per-email limits, constant-time bcrypt check (a dummy hash for unknown emails).", fails: "429 too many attempts, 401 invalid credentials." },
      { lane: "api", title: "Two-factor challenge", fn: "issueMfaChallenge()", file: "src/lib/auth/mfaChallenge.ts", what: "If 2FA is on, a short-lived signed challenge is returned and the TOTP or recovery code is verified.", fails: "Expired challenges restart sign-in." },
      { lane: "db", title: "Create session", fn: "createSession()", file: "src/lib/auth/session.ts", what: "A random token is stored hashed; disabled users are refused.", fails: "Signing out deletes the session everywhere it is used." },
      { lane: "client", title: "httpOnly cookie", fn: "Set-Cookie", file: "src/lib/auth/session.ts", what: "Secure, httpOnly session cookie plus a hint cookie for the public site's Dashboard button.", fails: "Admins land on /admin, everyone else on /overview." },
    ],
  },
];

const ROW_H = 92;
const NODE_H = 62;
const PAD_TOP = 18;

export function FlowDiagram() {
  const [flowId, setFlowId] = useState(FLOWS[0].id);
  const flow = FLOWS.find((f) => f.id === flowId)!;
  const [sel, setSel] = useState(0);
  const step = flow.steps[Math.min(sel, flow.steps.length - 1)];
  // Lanes share the available width (scrolls sideways only below ~720px).
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(900);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const COL_W = Math.max(120, Math.floor(boxW / LANES.length));
  const NODE_W = COL_W - 16;

  const nodes = useMemo(
    () =>
      flow.steps.map((s, i) => {
        const col = LANES.findIndex((l) => l.id === s.lane);
        return { ...s, i, x: col * COL_W + (COL_W - NODE_W) / 2, y: PAD_TOP + i * ROW_H };
      }),
    [flow, COL_W, NODE_W],
  );
  const width = LANES.length * COL_W;
  const height = PAD_TOP * 2 + flow.steps.length * ROW_H - (ROW_H - NODE_H);

  const paths = nodes.slice(1).map((n, k) => {
    const a = nodes[k];
    const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H;
    const x2 = n.x + NODE_W / 2, y2 = n.y;
    const my = (y1 + y2) / 2;
    return { d: `M${x1} ${y1} C${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`, k };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Flows">
        {FLOWS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.id === flowId}
            onClick={() => {
              setFlowId(f.id);
              setSel(0);
            }}
            className="rounded-full border px-4 py-2 text-[13px] transition-colors"
            style={{
              borderColor: f.id === flowId ? "var(--violet)" : "var(--border)",
              background: f.id === flowId ? "color-mix(in srgb, var(--violet) 14%, transparent)" : "transparent",
              color: f.id === flowId ? "var(--fg)" : "var(--fg-muted)",
            }}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <p className="text-sm text-fg-muted">{flow.summary}</p>
            <span className="shrink-0 text-xs text-fg-subtle">{flow.steps.length} steps</span>
          </div>
          <div ref={box} className="overflow-x-auto">
            <div className="relative" style={{ width, minWidth: width }}>
              {/* Lane headers */}
              <div className="sticky top-0 z-[2] flex border-b border-border" style={{ background: "var(--bg-card)" }}>
                {LANES.map((l) => (
                  <div key={l.id} className="flex items-center justify-center gap-1.5 py-2.5 text-[11.5px] font-medium" style={{ width: COL_W, color: l.color }}>
                    <Icon name={l.icon} size={13} /> {l.name}
                  </div>
                ))}
              </div>
              <div className="relative" style={{ height }}>
                {/* Lane stripes */}
                {LANES.map((l, i) => (
                  <div key={l.id} className="absolute top-0 bottom-0" style={{ left: i * COL_W, width: COL_W, background: i % 2 ? "color-mix(in srgb, var(--fg) 2.5%, transparent)" : "transparent", borderLeft: i ? "1px dashed var(--border)" : undefined }} />
                ))}
                {/* Connectors */}
                <svg className="absolute inset-0" width={width} height={height} aria-hidden>
                  <defs>
                    <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M0 0L10 5L0 10z" fill="var(--fg-subtle)" />
                    </marker>
                  </defs>
                  {paths.map((p) => (
                    <g key={p.k}>
                      <path d={p.d} fill="none" stroke="var(--border-strong)" strokeWidth="1.6" markerEnd="url(#flow-arrow)" />
                      <path d={p.d} fill="none" stroke={p.k + 1 === sel || p.k === sel ? "var(--violet)" : "var(--lime)"} strokeWidth="2" strokeLinecap="round" strokeDasharray="4 120" className="flow-packet" style={{ animationDelay: `${p.k * 0.35}s` }} />
                    </g>
                  ))}
                </svg>
                {/* Nodes */}
                {nodes.map((n) => {
                  const lane = LANES.find((l) => l.id === n.lane)!;
                  const active = n.i === sel;
                  return (
                    <button
                      key={n.i}
                      onClick={() => setSel(n.i)}
                      className="absolute flex flex-col justify-center rounded-2xl border px-3 text-left transition-all hover:-translate-y-0.5"
                      style={{
                        left: n.x,
                        top: n.y,
                        width: NODE_W,
                        height: NODE_H,
                        background: "var(--bg-elevated)",
                        borderColor: active ? lane.color : "var(--border)",
                        boxShadow: active ? `0 0 0 3px color-mix(in srgb, ${lane.color} 22%, transparent), 0 10px 24px -12px rgba(0,0,0,.6)` : "0 6px 16px -12px rgba(0,0,0,.6)",
                      }}
                      aria-pressed={active}
                    >
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: lane.color }}>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[9px]" style={{ background: `color-mix(in srgb, ${lane.color} 20%, transparent)` }}>{n.i + 1}</span>
                        {lane.name.split(" ")[0]}
                      </span>
                      <span className="mt-1 line-clamp-2 text-[12px] font-medium leading-tight [overflow-wrap:anywhere]">{n.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step details */}
        <aside className="card h-fit space-y-4 p-5 xl:sticky xl:top-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-fg-subtle">Step {sel + 1} of {flow.steps.length}</span>
            <div className="flex gap-1">
              <button className="btn btn-ghost btn-sm w-8 px-0" onClick={() => setSel((s) => Math.max(0, s - 1))} disabled={sel === 0} aria-label="Previous step"><Icon name="chevron-left" size={15} /></button>
              <button className="btn btn-ghost btn-sm w-8 px-0" onClick={() => setSel((s) => Math.min(flow.steps.length - 1, s + 1))} disabled={sel === flow.steps.length - 1} aria-label="Next step"><Icon name="chevron-right" size={15} /></button>
            </div>
          </div>
          <div>
            <p className="text-[17px] font-medium">{step.title}</p>
            <p className="mono mt-1 text-xs" style={{ color: "var(--violet)" }}>{step.fn}</p>
          </div>
          <p className="text-sm leading-relaxed text-fg-muted">{step.what}</p>
          <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: "color-mix(in srgb, var(--danger) 9%, transparent)", color: "var(--fg-muted)" }}>
            <p className="mb-1 flex items-center gap-1.5 font-medium" style={{ color: "var(--danger)" }}><Icon name="alert" size={13} /> When it fails</p>
            {step.fails}
          </div>
          <p className="mono flex items-center gap-1.5 break-all text-[11.5px] text-fg-subtle"><Icon name="code" size={13} /> {step.file}</p>
        </aside>
      </div>
    </div>
  );
}
