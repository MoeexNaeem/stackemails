import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { SupportTicket, Workspace } from "@/lib/db/models";
import { StaffReplyForm } from "@/components/admin/OpsForms";
import { setTicketStatusAction } from "@/app/admin/ops-actions";
import { timeAgo } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ticket" };

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  await connectToDatabase();
  const t = await SupportTicket.findById(id).lean();
  if (!t) notFound();
  const ws = t.workspaceId ? await Workspace.findById(t.workspaceId).select("name plan status").lean() : null;

  return (
    <div className="space-y-5">
      <Link href="/admin/support" className="text-sm text-fg-muted hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Support</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-xs text-fg-subtle">Ticket #{t.number}</p>
          <h1 className="mt-1 text-[26px] font-normal tracking-[-0.02em]">{t.subject}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {t.email}
            {ws && <> · <Link href={`/admin/users/${ws._id}`} className="hover:text-fg">{ws.name}</Link> ({ws.plan})</>}
            {" "}· <span className="capitalize">{t.category}</span> · <span className="capitalize">{t.priority}</span> priority
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["open", "pending", "resolved", "closed"] as const).map((s) => (
            <form key={s} action={setTicketStatusAction.bind(null, String(t._id), s)}>
              <button className={`btn btn-sm ${t.status === s ? "btn-primary" : "btn-secondary"}`} aria-pressed={t.status === s}>{s[0].toUpperCase() + s.slice(1)}</button>
            </form>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <ol className="space-y-3">
          {t.messages.map((m, i) => (
            <li key={i} className="card p-5" style={m.author === "staff" ? { borderColor: "color-mix(in srgb, var(--violet) 40%, transparent)" } : undefined}>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs text-fg-subtle">
                <span><span className="font-medium text-fg">{m.name || (m.author === "staff" ? "Support" : t.email)}</span> · {m.author === "staff" ? "Staff" : "Customer"}</span>
                <time dateTime={new Date(m.at).toISOString()} title={new Date(m.at).toLocaleString()}>{timeAgo(m.at)}</time>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
            </li>
          ))}
        </ol>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <StaffReplyForm id={String(t._id)} status={t.status} />
          {t.category === "billing" && /plan change/i.test(t.subject) && ws && (
            <p className="mt-3 text-sm text-fg-muted">Plan request. Change it under <Link href={`/admin/users/${ws._id}`} className="underline">the team&apos;s page &gt; Plan</Link>, then resolve this ticket.</p>
          )}
        </div>
      </div>
    </div>
  );
}
