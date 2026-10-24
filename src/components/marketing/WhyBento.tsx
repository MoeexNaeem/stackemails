import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * "Why Stack Emails" bento: each card shows a small, honest slice of the
 * product (a real trace, real DNS records, a real webhook) instead of a
 * generic icon-and-paragraph tile.
 */
export function WhyBento() {
  return (
    <section className="m-container py-24" aria-labelledby="why-title">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
        <div>
          <p data-reveal className="m-eyebrow">Why Stack Emails</p>
          <h2 id="why-title" data-reveal className="m-h2 mt-4 max-w-[17ch]" style={{ "--d": "80ms" } as React.CSSProperties}>
            Most APIs stop at <span className="m-highlight">accepted.</span> We follow every email to the inbox.
          </h2>
        </div>
        <p data-reveal className="m-lead max-w-[520px] lg:justify-self-end" style={{ "--d": "160ms" } as React.CSSProperties}>
          Authentication, bounces, unsubscribes, analytics and real-time events are part of the platform, not a weekend project you have to build around it.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* 1. Trace */}
        <Card className="lg:col-span-4" d={0} href="/features/transactional-email" title="Every email, traced end to end" body="One timeline per message, from the API call to the inbox and the webhook that tells your app about it.">
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--m-line)", background: "var(--m-bg)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-[12.5px]" style={{ borderColor: "var(--m-line)" }}>
              <span className="font-medium" style={{ color: "var(--m-head)", fontFamily: "var(--font-mono)" }}>msg_5b1f0c6c2a8e</span>
              <span style={{ color: "var(--m-muted)" }}>Your receipt &middot; ada@example.com</span>
            </div>
            <ol className="mt-3 space-y-2.5">
              {TRACE.map((t, i) => (
                <li key={t.label} className="grid grid-cols-[18px_1fr_auto] items-center gap-3 text-[13px]">
                  <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full" style={{ background: i === TRACE.length - 1 ? "#d1ff19" : "color-mix(in srgb, var(--m-accent) 16%, transparent)", color: i === TRACE.length - 1 ? "#112220" : "var(--m-accent-ink)" }}>
                    <Icon name={t.icon} size={11} strokeWidth={2.4} />
                  </span>
                  <span style={{ color: "var(--m-head)" }}>{t.label} <span style={{ color: "var(--m-muted)" }}>{t.detail}</span></span>
                  <span className="text-[12px] tabular-nums" style={{ color: "var(--m-faint)", fontFamily: "var(--font-mono)" }}>{t.at}</span>
                </li>
              ))}
            </ol>
          </div>
        </Card>

        {/* 2. DNS */}
        <Card className="lg:col-span-2" d={90} href="/blog/spf-dkim-dmarc-setup-guide" title="Authenticated on day one" body="DKIM, SPF and DMARC records generated for every domain, then checked for you every few minutes.">
          <ul className="space-y-2">
            {DNS.map((r) => (
              <li key={r.name} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-[12.5px]" style={{ borderColor: "var(--m-line)", background: "var(--m-bg)" }}>
                <span className="min-w-0">
                  <span className="mr-2 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold" style={{ background: "var(--m-linen)", color: "var(--m-head)", fontFamily: "var(--font-mono)" }}>{r.type}</span>
                  <span style={{ color: "var(--m-text)", fontFamily: "var(--font-mono)" }}>{r.name}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[11.5px] font-medium" style={{ color: "#16a34a" }}><Icon name="check" size={12} strokeWidth={2.6} />Verified</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* 3. Suppression */}
        <Card className="lg:col-span-2" d={0} href="/blog/reduce-email-bounce-rate" title="Suppression that protects you" body="Hard bounces, complaints and unsubscribes are skipped automatically, so one bad list never costs you your reputation.">
          <ul className="space-y-2">
            {SUPPRESSED.map((s) => (
              <li key={s.email} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="truncate" style={{ color: "var(--m-text)", fontFamily: "var(--font-mono)" }}>{s.email}</span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: s.bg, color: s.fg }}>{s.reason}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-[12px]" style={{ color: "var(--m-muted)" }}><Icon name="shield" size={13} /> 3 sends skipped this week</p>
        </Card>

        {/* 4. Webhooks */}
        <Card className="lg:col-span-2" d={90} href="/features/email-webhooks" title="Webhooks you can trust" body="Every event is signed with a timestamp and retried with backoff, with a delivery log you can replay from.">
          <div className="rounded-2xl p-4 text-[12px] leading-relaxed" style={{ background: "#15171a", color: "#cbd5e1", fontFamily: "var(--font-mono)" }}>
            <p><span style={{ color: "#a39bff" }}>POST</span> acme.com/hooks/email</p>
            <p className="truncate" style={{ color: "#94a3b8" }}>x-stackemails-signature-v2: t=1761300000,v1=5257a8…</p>
            <div className="mt-3 flex items-center gap-1.5">
              {ATTEMPTS.map((a, i) => (
                <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: a === "ok" ? "#4ade80" : a === "fail" ? "#f87171" : "#3f3f46" }} />
              ))}
            </div>
            <p className="mt-2 flex items-center justify-between"><span style={{ color: "#4ade80" }}>200 OK</span><span style={{ color: "#94a3b8" }}>attempt 2 of 6 &middot; 84ms</span></p>
          </div>
        </Card>

        {/* 5. Broadcasts */}
        <Card className="md:col-span-2 lg:col-span-2" d={180} href="/features/marketing-email" title="Broadcasts with real audiences" body="Segments, subscription topics and merge tags, with one-click unsubscribe added to every send.">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--m-line)", background: "var(--m-bg)" }}>
            <p className="text-[11.5px] uppercase tracking-[0.12em]" style={{ color: "var(--m-faint)" }}>Subject</p>
            <p className="mt-1 text-[14px] font-medium" style={{ color: "var(--m-head)" }}>
              Hi <span className="rounded-md px-1" style={{ background: "var(--m-highlight)" }}>Ada</span>, your October report is ready
            </p>
            <p className="mt-1 text-[11.5px]" style={{ color: "var(--m-faint)", fontFamily: "var(--font-mono)" }}>{"Hi {{first_name}}, your {{month}} report is ready"}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {["Beta users", "Pro plan", "Product updates"].map((c) => (
                <span key={c} className="rounded-full border px-2.5 py-1 text-[11.5px]" style={{ borderColor: "var(--m-line)", color: "var(--m-text)" }}>{c}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* 6. Inbound */}
        <Card className="lg:col-span-3" d={0} href="/features/inbound-email" title="Receive and reply, not just send" body="Inbound email lands in shared inboxes with threads, and every message fires an email.received webhook.">
          <ul className="divide-y rounded-2xl border" style={{ borderColor: "var(--m-line)", background: "var(--m-bg)" }}>
            {INBOX.map((m) => (
              <li key={m.from} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: "var(--m-line)" }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold" style={{ background: m.bg, color: "#112220" }}>{m.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium" style={{ color: "var(--m-head)" }}>{m.from}</span>
                    <span className="shrink-0 text-[11.5px]" style={{ color: "var(--m-faint)" }}>{m.at}</span>
                  </span>
                  <span className="block truncate text-[12.5px]" style={{ color: "var(--m-muted)" }}>{m.subject}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* 7. Agents */}
        <Card className="lg:col-span-3" d={90} href="/features/mcp-server" title="Built for AI agents" body="A native MCP server lets Claude, Cursor and your own agents send email with the same guardrails as your API keys.">
          <div className="space-y-2.5">
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-[13px]" style={{ background: "var(--m-ink)", color: "var(--m-on-ink)" }}>
              Email the 5 newest Beta contacts a thank-you note.
            </p>
            <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-[12.5px]" style={{ borderColor: "var(--m-line)", background: "var(--m-bg)" }}>
              <p className="flex items-center gap-1.5" style={{ color: "var(--m-muted)", fontFamily: "var(--font-mono)" }}>
                <Icon name="code" size={13} /> list_contacts <Icon name="chevron-right" size={12} /> send_email &times; 5
              </p>
              <p className="mt-1.5 flex items-center gap-1.5" style={{ color: "var(--m-head)" }}>
                <Icon name="check" size={13} strokeWidth={2.6} style={{ color: "#16a34a" }} /> 5 emails delivered from agents.acme.com
              </p>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Card({ className = "", d, href, title, body, children }: { className?: string; d: number; href: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <Link href={href} data-reveal className={`m-card m-card-hover m-spot group flex min-w-0 flex-col !p-5 sm:!p-6 ${className}`} style={{ "--d": `${d}ms` } as React.CSSProperties}>
      <div className="min-w-0 flex-1 overflow-hidden rounded-[18px] p-3 sm:p-4" style={{ background: "var(--m-linen)" }}>{children}</div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <h3 className="m-h3 text-[18px]">{title}</h3>
          <p className="mt-1.5 text-[14.5px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{body}</p>
        </div>
        <span className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all group-hover:translate-x-0.5" style={{ borderColor: "var(--m-line)", color: "var(--m-head)" }}>
          <Icon name="arrow-right" size={14} />
        </span>
      </div>
    </Link>
  );
}

const TRACE: { label: string; detail: string; at: string; icon: IconName }[] = [
  { label: "Accepted", detail: "POST /v1/emails", at: "0 ms", icon: "code" },
  { label: "Checked", detail: "sender, quota, suppression list", at: "4 ms", icon: "shield" },
  { label: "DKIM signed", detail: "2048-bit, mail.acme.com", at: "11 ms", icon: "lock" },
  { label: "Sent", detail: "via Amazon SES", at: "142 ms", icon: "send" },
  { label: "Delivered", detail: "to gmail.com", at: "1.2 s", icon: "inbox" },
  { label: "Webhook", detail: "email.delivered, 200 OK", at: "1.3 s", icon: "zap" },
];

const DNS = [
  { type: "CNAME", name: "abc._domainkey" },
  { type: "MX", name: "send.mail" },
  { type: "TXT", name: "send.mail (SPF)" },
  { type: "TXT", name: "_dmarc" },
];

const SUPPRESSED = [
  { email: "old.user@gmail.com", reason: "Hard bounce", bg: "rgba(239,68,68,.12)", fg: "#dc2626" },
  { email: "j.doe@yahoo.com", reason: "Complaint", bg: "rgba(245,158,11,.14)", fg: "#b45309" },
  { email: "ex@acme.io", reason: "Unsubscribed", bg: "color-mix(in srgb, var(--m-accent) 14%, transparent)", fg: "var(--m-accent-ink)" },
];

const ATTEMPTS: ("ok" | "fail" | null)[] = ["fail", "ok", null, null, null, null];

const INBOX = [
  { initials: "GL", from: "Grace Lin", subject: "Re: Invoice #10482, can you resend the PDF?", at: "2m", bg: "#d5d1f4" },
  { initials: "MO", from: "Marco Ortiz", subject: "Question about the Pro plan limits", at: "18m", bg: "#e9ffb0" },
  { initials: "SK", from: "Sara Kim", subject: "Thanks, the reset link worked", at: "1h", bg: "#ffe4a8" },
];
