import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Contact, ContactProperty, EmailLog, Segment, Topic } from "@/lib/db/models";
import { isSubscribedToTopic, unsubscribeUrls } from "@/lib/contacts";
import { ContactEditor } from "@/components/audience/ContactEditor";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  const contact = await Contact.findOne({ _id: id, workspaceId: workspace._id }).lean();
  if (!contact) notFound();

  const [segments, properties, topics, emails] = await Promise.all([
    Segment.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    ContactProperty.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    Topic.find({ workspaceId: workspace._id }).sort({ createdAt: 1 }).lean(),
    EmailLog.find({ workspaceId: workspace._id, to: contact.email }).sort({ createdAt: -1 }).limit(20).select("messageId subject status createdAt").lean(),
  ]);
  const props = (contact.properties ?? {}) as Record<string, unknown>;

  return (
    <div>
      <Link href="/audience" className="text-sm text-fg-subtle hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Contacts</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-normal">{contact.email}</h2>
        <span className={`badge ${contact.unsubscribed ? "delta-down" : "delta-up"}`}>{contact.unsubscribed ? "Unsubscribed" : "Subscribed"}</span>
        <span className="text-xs text-fg-subtle">Added {new Date(contact.createdAt).toLocaleString()} · via {contact.source}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ContactEditor
          contact={{
            id: String(contact._id),
            firstName: contact.firstName ?? "",
            lastName: contact.lastName ?? "",
            unsubscribed: !!contact.unsubscribed,
            segmentIds: (contact.segmentIds ?? []).map(String),
            properties: Object.fromEntries(Object.entries(props).map(([k, v]) => [k, v == null ? "" : String(v)])),
            topics: Object.fromEntries(topics.map((t) => [String(t._id), isSubscribedToTopic(contact, t)])),
          }}
          segments={segments.map((s) => ({ id: String(s._id), name: s.name }))}
          properties={properties.map((p) => ({ key: p.key, label: p.label, type: p.type }))}
          topics={topics.map((t) => ({ id: String(t._id), name: t.name }))}
        />

        <div className="space-y-4">
          <div className="card p-5">
            <p className="card-title mb-3">Preference page</p>
            <p className="text-xs text-fg-subtle mb-2">The hosted page this contact sees from the unsubscribe link.</p>
            <a href={unsubscribeUrls(contact._id).page} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Open preference page <Icon name="arrow-up-right" size={14} /></a>
          </div>
          <div className="card overflow-hidden">
            <p className="card-title px-5 pt-4 pb-2">Recent emails</p>
            {emails.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-fg-subtle">No emails sent to this contact yet.</p>
            ) : (
              <ul>
                {emails.map((e) => (
                  <li key={e.messageId} className="flex items-center justify-between gap-3 border-t border-border px-5 py-2.5 text-sm">
                    <Link href={`/emails/${e.messageId}`} className="truncate hover:text-accent">{e.subject}</Link>
                    <StatusBadge status={e.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
