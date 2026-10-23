import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Broadcast, Contact, ContactProperty, Domain, Segment, Topic } from "@/lib/db/models";
import { BroadcastEditor, type BroadcastEditorData } from "@/components/dashboard/BroadcastEditor";
import { refreshBroadcastStats } from "@/lib/broadcast";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Broadcast" };

export default async function BroadcastEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const { workspace, user } = await requireDashboardContext();
  await connectToDatabase();
  let bc = await Broadcast.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!bc) notFound();
  if (bc.status !== "draft") {
    await refreshBroadcastStats(bc._id);
    bc = (await Broadcast.findById(bc._id).lean())!;
  }

  const [segments, counts, topics, domains, properties] = await Promise.all([
    Segment.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    Contact.aggregate([
      { $match: { workspaceId: workspace._id, unsubscribed: { $ne: true } } },
      { $unwind: "$segmentIds" },
      { $group: { _id: "$segmentIds", n: { $sum: 1 } } },
    ]),
    Topic.find({ workspaceId: workspace._id }).select("name").lean(),
    Domain.find({ workspaceId: workspace._id, status: "verified" }).select("name").lean(),
    ContactProperty.find({ workspaceId: workspace._id }).select("key").lean(),
  ]);
  const n = new Map(counts.map((c) => [String(c._id), c.n as number]));

  const data: BroadcastEditorData = {
    id: String(bc._id),
    name: bc.name,
    status: bc.status,
    from: bc.from || (domains[0] ? `${workspace.name} <hello@${domains[0].name}>` : ""),
    replyTo: bc.replyTo,
    subject: bc.subject,
    previewText: bc.previewText,
    html: bc.html,
    design: bc.design ?? "",
    audienceId: bc.audienceId ? String(bc.audienceId) : "",
    topicId: bc.topicId ? String(bc.topicId) : "",
    scheduledAt: bc.scheduledAt ? bc.scheduledAt.toISOString() : null,
    sentAt: bc.sentAt ? bc.sentAt.toISOString() : null,
    stats: { recipients: bc.stats?.recipients ?? 0, delivered: bc.stats?.delivered ?? 0, opened: bc.stats?.opened ?? 0, clicked: bc.stats?.clicked ?? 0 },
  };

  return (
    <BroadcastEditor
      data={data}
      audiences={segments.map((s) => ({ id: String(s._id), name: s.name, contactCount: n.get(String(s._id)) ?? 0 }))}
      topics={topics.map((t) => ({ id: String(t._id), name: t.name }))}
      mergeTags={["first_name", "last_name", "email", ...properties.map((p) => `contact.${p.key}`), "unsubscribe_url"]}
      userEmail={user.email}
      hasVerifiedDomain={domains.length > 0}
    />
  );
}
