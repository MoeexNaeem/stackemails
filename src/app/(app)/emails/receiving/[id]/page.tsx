import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { InboundEmail, Inbox } from "@/lib/db/models";
import { EmailPreview } from "@/components/emails/EmailPreview";
import { markInboundReadAction } from "@/app/(app)/emails-actions";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Received email" };

export default async function ReceivedEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const e = await InboundEmail.findOne({ workspaceId: workspace._id, messageId: id }).lean();
  if (!e) notFound();
  if (!e.read) await markInboundReadAction(id);
  const inbox = e.inboxId ? await Inbox.findById(e.inboxId).select("name").lean() : null;

  return (
    <div>
      <Link href="/emails/receiving" className="text-sm text-fg-subtle hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Received emails</Link>
      <h1 className="mt-3 text-[26px] font-normal tracking-tight">{e.subject}</h1>
      <div className="mt-4 mb-6 grid gap-4 sm:grid-cols-4 text-sm">
        <Meta label="From" value={e.fromName ? `${e.fromName} <${e.from}>` : e.from} />
        <Meta label="To" value={e.to.join(", ")} />
        <Meta label="Received" value={new Date(e.createdAt).toLocaleString()} />
        <Meta label="Inbox" value={inbox?.name ?? "-"} />
      </div>
      {(e.spamVerdict === "FAIL" || e.virusVerdict === "FAIL") && (
        <p className="mb-4 rounded-xl px-4 py-2.5 text-sm" style={{ color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 10%, transparent)" }}>
          <Icon name="alert" size={15} className="mr-1.5" />This message was flagged by {e.virusVerdict === "FAIL" ? "virus" : "spam"} scanning. Be careful with links and attachments.
        </p>
      )}
      <EmailPreview html={e.html ?? null} text={e.text ?? null} />
      {e.attachments?.length ? (
        <div className="card mt-4 p-5">
          <p className="card-title mb-2">Attachments</p>
          <ul className="text-sm text-fg-muted space-y-1">
            {e.attachments.map((a, i) => <li key={i}><Icon name="paperclip" size={14} className="mr-1" />{a.filename} <span className="text-fg-subtle">({Math.max(1, Math.round((a.size ?? 0) / 1024))} KB · {a.contentType})</span></li>)}
          </ul>
        </div>
      ) : null}
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
