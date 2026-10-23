import { createHmac, timingSafeEqual } from "node:crypto";
import type { Types } from "mongoose";
import { Contact, ContactProperty, type ContactDoc, type ContactPropertyDoc, type TopicDoc } from "@/lib/db/models";
import { env } from "@/lib/env";

type Id = Types.ObjectId | string;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(raw: string): string | null {
  const e = String(raw ?? "").trim().toLowerCase();
  return EMAIL_RE.test(e) && e.length <= 254 ? e : null;
}

export type ContactInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
  properties?: Record<string, unknown>;
  segmentIds?: string[];
  source?: "api" | "dashboard" | "import" | "inbound";
};

/**
 * Create or merge a contact (one per email per team). New segment ids are
 * added, properties are merged, and names only overwrite when provided.
 */
export async function upsertContact(workspaceId: Id, input: ContactInput): Promise<{ contact: ContactDoc; created: boolean }> {
  const email = normalizeEmail(input.email);
  if (!email) throw Object.assign(new Error("Invalid email address."), { code: "invalid_email" });

  const set: Record<string, unknown> = {};
  if (input.firstName !== undefined) set.firstName = input.firstName.trim().slice(0, 100);
  if (input.lastName !== undefined) set.lastName = input.lastName.trim().slice(0, 100);
  if (input.unsubscribed !== undefined) {
    set.unsubscribed = input.unsubscribed;
    if (input.unsubscribed) set.unsubscribedAt = new Date();
  }
  for (const [k, v] of Object.entries(input.properties ?? {})) {
    if (/^[a-z][a-z0-9_]{0,49}$/.test(k)) set[`properties.${k}`] = v;
  }

  const existed = await Contact.exists({ workspaceId, email });
  const contact = await Contact.findOneAndUpdate(
    { workspaceId, email },
    {
      $set: set,
      $setOnInsert: { source: input.source ?? "dashboard" },
      ...(input.segmentIds?.length ? { $addToSet: { segmentIds: { $each: input.segmentIds } } } : {}),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return { contact: contact!, created: !existed };
}

/** Whether a contact should receive mail for a topic (explicit choice, else the topic default). */
export function isSubscribedToTopic(contact: Pick<ContactDoc, "topics" | "unsubscribed">, topic: Pick<TopicDoc, "_id" | "defaultSubscribed">): boolean {
  if (contact.unsubscribed) return false;
  const choice = contact.topics?.find((t) => String(t.topicId) === String(topic._id));
  return choice ? choice.subscribed : topic.defaultSubscribed !== false;
}

/**
 * Replace merge tags: {{first_name}}, {{last_name}}, {{email}},
 * {{contact.<key>}} (falls back to the property's fallback) and
 * {{unsubscribe_url}}. Values are HTML-escaped in HTML bodies.
 */
export function renderMergeTags(
  template: string,
  contact: Pick<ContactDoc, "email" | "firstName" | "lastName" | "properties">,
  properties: Pick<ContactPropertyDoc, "key" | "fallback">[],
  extra: Record<string, string> = {},
  opts: { html?: boolean } = {},
): string {
  const esc = (s: string) => (opts.html ? s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") : s);
  const props = (contact.properties ?? {}) as Record<string, unknown>;
  const fallbacks = new Map(properties.map((p) => [p.key, p.fallback ?? ""]));
  return template.replace(/\{\{\{?\s*([a-z_.]+)\s*(?:\|\s*"([^"]*)")?\s*\}?\}\}/gi, (_m, key: string, inlineFallback?: string) => {
    const k = key.toLowerCase();
    let v: unknown;
    if (k === "first_name" || k === "contact.first_name") v = contact.firstName;
    else if (k === "last_name" || k === "contact.last_name") v = contact.lastName;
    else if (k === "email" || k === "contact.email") v = contact.email;
    else if (k in extra) return extra[k]; // trusted URLs, not escaped
    else if (k.startsWith("contact.")) v = props[k.slice(8)] ?? fallbacks.get(k.slice(8));
    const s = v === undefined || v === null || v === "" ? inlineFallback ?? "" : String(v);
    return esc(s);
  });
}

export async function propertiesFor(workspaceId: Id) {
  return ContactProperty.find({ workspaceId }).select("key fallback label type").lean();
}

// ── Signed unsubscribe / preference tokens ─────────────────
function sig(payload: string): string {
  return createHmac("sha256", env.sessionSecret).update(`unsub:${payload}`).digest("base64url").slice(0, 22);
}

/** Opaque token identifying a contact for the hosted preference page. */
export function unsubscribeToken(contactId: Id): string {
  const id = String(contactId);
  return `${id}.${sig(id)}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [id, s] = String(token ?? "").split(".");
  if (!id || !s || !/^[a-f0-9]{24}$/.test(id)) return null;
  const expected = sig(id);
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export function unsubscribeUrls(contactId: Id) {
  const token = unsubscribeToken(contactId);
  return {
    page: `${env.appUrl}/u/${token}`,
    oneClick: `${env.appUrl}/api/u/${token}`,
  };
}

/** RFC 8058 one-click unsubscribe headers required by Gmail/Yahoo for bulk mail. */
export function listUnsubscribeHeaders(contactId: Id) {
  const { oneClick } = unsubscribeUrls(contactId);
  return [
    { name: "List-Unsubscribe", value: `<${oneClick}>` },
    { name: "List-Unsubscribe-Post", value: "List-Unsubscribe=One-Click" },
  ];
}
