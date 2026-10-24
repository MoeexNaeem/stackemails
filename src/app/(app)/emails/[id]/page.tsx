import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, EmailLog } from "@/lib/db/models";
import { StatusBadge } from "@/components/StatusBadge";
import { EmailPreview } from "@/components/emails/EmailPreview";
import { CancelScheduledButton } from "@/components/emails/CancelScheduledButton";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email" };

const EVENT_COLOR: Record<string, string> = {
  queued: "var(--fg-subtle)",
  scheduled: "var(--info)",
  sent: "var(--violet)",
  delivered: "var(--success)",
  opened: "var(--lime)",
  clicked: "var(--lime)",
  bounced: "var(--danger)",
  complained: "var(--warning)",
  failed: "var(--danger)",
  canceled: "var(--fg-subtle)",
  suppressed: "var(--warning)",
  delivery_delayed: "var(--warning)",
};

export default async function EmailDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { workspace } = await requireDashboardContext();
  const { id } = await params;
  await connectToDatabase();
  const email = await EmailLog.findOne({ workspaceId: workspace._id, messageId: id }).lean();
  if (!email) notFound();
  const key = email.apiKeyId ? await ApiKey.findById(email.apiKeyId).select("name").lean() : null;

  return (
    <div>
      <Link href="/emails" className="text-sm text-fg-subtle hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Emails</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Email</p>
          <h1 className="mt-1 text-[26px] font-normal tracking-tight break-words">{email.subject}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={email.status} />
          {email.status === "scheduled" && <CancelScheduledButton messageId={email.messageId} />}
        </div>
      </div>

      <div className="card mb-6 grid gap-5 p-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="From" value={email.from} />
        <Meta label="To" value={email.to.join(", ")} />
        <Meta label="Created" value={new Date(email.createdAt).toLocaleString()} />
        <Meta label={email.status === "scheduled" ? "Scheduled for" : "Sent"} value={email.status === "scheduled" && email.scheduledAt ? new Date(email.scheduledAt).toLocaleString() : email.sentAt ? new Date(email.sentAt).toLocaleString() : "-"} />
        {email.cc?.length > 0 && <Meta label="Cc" value={email.cc.join(", ")} />}
        {email.bcc?.length > 0 && <Meta label="Bcc" value={email.bcc.join(", ")} />}
        {email.replyTo?.length > 0 && <Meta label="Reply-To" value={email.replyTo.join(", ")} />}
        <Meta label="Source" value={key ? `API key · ${key.name}` : email.source} />
        <div className="min-w-0">
          <p className="eyebrow">Email ID</p>
          <div className="mt-1 flex items-center gap-1.5"><code className="mono truncate text-xs">{email.messageId}</code><CopyButton value={email.messageId} className="!px-1.5 !py-0.5" /></div>
        </div>
        <Meta label="Opens / clicks" value={`${email.opens ?? 0} / ${email.clicks ?? 0}`} />
        {email.bounceType && <Meta label="Bounce type" value={email.bounceType} />}
      </div>

      {email.errorMessage && (
        <p className="mb-6 rounded-xl px-4 py-3 text-sm" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}>
          {email.errorMessage}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          <EmailPreview html={email.html ?? null} text={email.text ?? null} />
          {(email.attachments?.length || email.tags?.length || email.headers?.length) ? (
            <div className="card p-5 space-y-4 text-sm">
              {email.attachments?.length ? (
                <div>
                  <p className="eyebrow mb-1.5">Attachments</p>
                  {email.attachments.map((a, i) => <p key={i} className="text-fg-muted"><Icon name="paperclip" size={14} className="mr-1" />{a.filename} <span className="text-fg-subtle">({Math.max(1, Math.round((a.size ?? 0) / 1024))} KB)</span></p>)}
                </div>
              ) : null}
              {email.tags?.length ? (
                <div>
                  <p className="eyebrow mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">{email.tags.map((t, i) => <span key={i} className="badge mono" style={{ background: "var(--bg-hover)" }}>{t.name}: {t.value}</span>)}</div>
                </div>
              ) : null}
              {email.headers?.length ? (
                <div>
                  <p className="eyebrow mb-1.5">Headers</p>
                  {email.headers.map((h, i) => <p key={i} className="mono text-xs text-fg-muted break-all">{h.name}: {h.value}</p>)}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="card p-6 h-fit">
          <p className="card-title mb-5">Email events</p>
          <ol>
            {email.events.map((ev, i) => (
              <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i < email.events.length - 1 && <span className="absolute left-[5px] top-4 bottom-0 w-px" style={{ background: "var(--border-strong)" }} />}
                <span className="relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full" style={{ background: EVENT_COLOR[ev.type] ?? "var(--fg-subtle)", boxShadow: `0 0 0 3px color-mix(in srgb, ${EVENT_COLOR[ev.type] ?? "var(--fg-subtle)"} 18%, transparent)` }} />
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{ev.type.replace("_", " ")}</p>
                  <p className="text-xs text-fg-subtle">{new Date(ev.at).toLocaleString()}</p>
                  {ev.detail && <p className="mt-0.5 text-xs text-fg-muted break-words">{ev.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 truncate" title={value}>{value}</p>
    </div>
  );
}
