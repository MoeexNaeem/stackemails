import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { InboundEmail, Inbox } from "@/lib/db/models";
import { InboxView } from "@/components/inboxes/InboxView";
import { ReceivingAddress } from "@/components/emails/ReceivingAddress";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; compose?: string }> }) {
  const { id } = await params;
  const { t, compose } = await searchParams;
  if (!isValidObjectId(id)) notFound();
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const inbox = await Inbox.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!inbox) notFound();

  const threads = await InboundEmail.aggregate([
    { $match: { workspaceId: workspace._id, inboxId: inbox._id } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$threadId",
        subject: { $last: "$subject" },
        from: { $first: "$from" },
        fromName: { $first: "$fromName" },
        snippet: { $first: "$snippet" },
        at: { $first: "$createdAt" },
        count: { $sum: 1 },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ["$read", false] }, { $eq: ["$direction", "inbound"] }] }, 1, 0] } },
      },
    },
    { $sort: { at: -1 } },
    { $limit: 200 },
  ]);
  const activeThread = t ?? (compose ? undefined : threads[0]?._id);
  const messages = activeThread
    ? await InboundEmail.find({ workspaceId: workspace._id, inboxId: inbox._id, threadId: activeThread }).sort({ createdAt: 1 }).lean()
    : [];
  if (messages.some((m) => !m.read && m.direction === "inbound")) {
    const res = await InboundEmail.updateMany({ workspaceId: workspace._id, inboxId: inbox._id, threadId: activeThread, read: false }, { $set: { read: true } });
    await Inbox.updateOne({ _id: inbox._id }, { $inc: { unread: -Math.min(inbox.unread ?? 0, res.modifiedCount) } });
  }

  return (
    <div>
      <Link href="/inboxes" className="text-sm text-fg-subtle hover:text-fg">← Inboxes</Link>
      <div className="mt-3 mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-normal tracking-tight">{inbox.name}</h1>
          <p className="mono text-xs text-fg-subtle">{inbox.address}{inbox.alias ? ` · receives at ${inbox.alias}` : ""}</p>
        </div>
        {inbox.alias && <ReceivingAddress domain={inbox.alias.split("@")[1]} inboxId={String(inbox._id)} compact />}
      </div>
      <InboxView
        inbox={{ id: String(inbox._id), name: inbox.name, address: inbox.address }}
        threads={threads.map((th) => ({ id: String(th._id), subject: th.subject, from: th.fromName || th.from, snippet: th.snippet, at: new Date(th.at).toISOString(), count: th.count, unread: th.unread }))}
        activeThread={activeThread ? String(activeThread) : null}
        compose={!!compose}
        messages={messages.map((m) => ({ id: m.messageId, direction: m.direction, from: m.fromName ? `${m.fromName} <${m.from}>` : m.from, to: m.to.join(", "), subject: m.subject, text: m.text ?? "", html: m.html ?? null, at: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
