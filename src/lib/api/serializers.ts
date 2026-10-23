import type {
  ContactDoc,
  DomainDoc,
  EmailLogDoc,
  InboundEmailDoc,
  SegmentDoc,
  TopicDoc,
  ContactPropertyDoc,
  BroadcastDoc,
} from "@/lib/db/models";

type Lean<T> = Omit<T, "save">;

export function serializeEmail(e: Lean<EmailLogDoc>, full = false) {
  const base = {
    object: "email" as const,
    id: e.messageId,
    from: e.from,
    to: e.to,
    cc: e.cc ?? [],
    bcc: e.bcc ?? [],
    reply_to: e.replyTo ?? [],
    subject: e.subject,
    last_event: e.status,
    status: e.status,
    created_at: e.createdAt,
    scheduled_at: e.scheduledAt ?? null,
    sent_at: e.sentAt ?? null,
  };
  if (!full) return base;
  return {
    ...base,
    html: e.html ?? null,
    text: e.text ?? null,
    tags: e.tags ?? [],
    attachments: e.attachments ?? [],
    error: e.errorMessage ?? null,
    delivered_at: e.deliveredAt ?? null,
    opens: e.opens ?? 0,
    clicks: e.clicks ?? 0,
    events: (e.events ?? []).map((ev) => ({ type: ev.type, at: ev.at, detail: ev.detail ?? null })),
  };
}

export function serializeContact(c: Lean<ContactDoc>) {
  return {
    object: "contact" as const,
    id: String(c._id),
    email: c.email,
    first_name: c.firstName ?? "",
    last_name: c.lastName ?? "",
    unsubscribed: !!c.unsubscribed,
    properties: c.properties ?? {},
    segment_ids: (c.segmentIds ?? []).map(String),
    topics: (c.topics ?? []).map((t) => ({ topic_id: String(t.topicId), subscribed: t.subscribed })),
    created_at: c.createdAt,
  };
}

export function serializeSegment(s: Lean<SegmentDoc>, counts?: { contacts: number; unsubscribed: number }) {
  return { object: "segment" as const, id: String(s._id), name: s.name, description: s.description ?? "", ...(counts ?? {}), created_at: s.createdAt };
}

export function serializeTopic(t: Lean<TopicDoc>) {
  return {
    object: "topic" as const,
    id: String(t._id),
    name: t.name,
    description: t.description ?? "",
    default_subscription: t.defaultSubscribed ? "opt_in" : "opt_out",
    visibility: t.visibility,
    created_at: t.createdAt,
  };
}

export function serializeProperty(p: Lean<ContactPropertyDoc>) {
  return { object: "contact_property" as const, id: String(p._id), key: p.key, label: p.label, type: p.type, fallback_value: p.fallback ?? "", created_at: p.createdAt };
}

export function serializeDomain(d: Lean<DomainDoc>, full = false) {
  const base = { object: "domain" as const, id: String(d._id), name: d.name, status: d.status, region: d.region, created_at: d.createdAt };
  if (!full) return base;
  return {
    ...base,
    records: (d.records ?? []).map((r) => ({ record: r.purpose, type: r.type, name: r.name, value: r.value, status: r.status })),
    capabilities: { sending: d.status === "verified" ? "enabled" : "disabled", receiving: d.receivingEnabled ? "enabled" : "disabled" },
    open_tracking: !!d.openTracking,
    click_tracking: !!d.clickTracking,
  };
}

export function serializeInbound(e: Lean<InboundEmailDoc>, full = false) {
  const base = { object: "received_email" as const, id: e.messageId, from: e.from, to: e.to, subject: e.subject, created_at: e.createdAt };
  if (!full) return base;
  return { ...base, cc: e.cc ?? [], text: e.text ?? null, html: e.html ?? null, attachments: e.attachments ?? [], message_id: e.rfcMessageId ?? null };
}

export function serializeBroadcast(b: Lean<BroadcastDoc>) {
  return {
    object: "broadcast" as const,
    id: String(b._id),
    name: b.name,
    status: b.status,
    segment_id: b.audienceId ? String(b.audienceId) : null,
    topic_id: b.topicId ? String(b.topicId) : null,
    from: b.from,
    subject: b.subject,
    scheduled_at: b.scheduledAt ?? null,
    sent_at: b.sentAt ?? null,
    created_at: b.createdAt,
  };
}
