"use server";

import { revalidatePath } from "next/cache";
import { isValidObjectId, type Types } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Contact, ContactProperty, Segment, Topic } from "@/lib/db/models";
import { normalizeEmail, upsertContact } from "@/lib/contacts";
import { parseCsv, headerKey } from "@/lib/csv";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { runAutomationsForContact } from "@/lib/automations/run";
import { serializeContact } from "@/lib/api/serializers";
import { limitsFor } from "@/lib/plans";

export type AudienceState = { ok: boolean; error?: string; message?: string };

async function ctx() {
  const { workspace } = await requireDashboardContext();
  await connectToDatabase();
  return workspace;
}

function refresh() {
  revalidatePath("/audience", "layout");
}

function ids(formData: FormData, name: string): string[] {
  return formData.getAll(name).map(String).filter(isValidObjectId);
}

async function ownedSegments(workspaceId: Types.ObjectId, segIds: string[]) {
  if (!segIds.length) return [];
  const rows = await Segment.find({ _id: { $in: segIds }, workspaceId }).select("_id").lean();
  return rows.map((r) => String(r._id));
}

// ── Contacts ──────────────────────────────────────────────
export async function createContactAction(_prev: AudienceState, formData: FormData): Promise<AudienceState> {
  const workspace = await ctx();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { ok: false, error: "Enter a valid email address." };
  const segmentIds = await ownedSegments(workspace._id, ids(formData, "segmentIds"));

  const props = await ContactProperty.find({ workspaceId: workspace._id }).lean();
  const properties: Record<string, unknown> = {};
  for (const p of props) {
    const raw = formData.get(`prop_${p.key}`);
    if (raw === null || raw === "") continue;
    properties[p.key] = coerce(String(raw), p.type);
  }

  const { contact, created } = await upsertContact(workspace._id, {
    email,
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    unsubscribed: formData.get("unsubscribed") === "on",
    properties,
    segmentIds,
    source: "dashboard",
  });
  emitEvent(String(workspace._id), created ? "contact.created" : "contact.updated", serializeContact(contact)).catch(() => {});
  if (created) runAutomationsForContact(workspace._id, contact, segmentIds).catch(() => {});
  refresh();
  return { ok: true, message: created ? "Contact added." : "Contact already existed, so the details were merged." };
}

export async function updateContactAction(_prev: AudienceState, formData: FormData): Promise<AudienceState> {
  const workspace = await ctx();
  const id = String(formData.get("id") ?? "");
  if (!isValidObjectId(id)) return { ok: false, error: "Contact not found." };
  const contact = await Contact.findOne({ _id: id, workspaceId: workspace._id });
  if (!contact) return { ok: false, error: "Contact not found." };

  contact.firstName = String(formData.get("firstName") ?? "").trim();
  contact.lastName = String(formData.get("lastName") ?? "").trim();
  const unsub = formData.get("unsubscribed") === "on";
  if (unsub && !contact.unsubscribed) contact.unsubscribedAt = new Date();
  contact.unsubscribed = unsub;
  contact.segmentIds = (await ownedSegments(workspace._id, ids(formData, "segmentIds"))) as never;

  const props = await ContactProperty.find({ workspaceId: workspace._id }).lean();
  const next = { ...(contact.properties ?? {}) } as Record<string, unknown>;
  for (const p of props) {
    const raw = formData.get(`prop_${p.key}`);
    if (raw === null) continue;
    if (raw === "") delete next[p.key];
    else next[p.key] = coerce(String(raw), p.type);
  }
  contact.properties = next;
  contact.markModified("properties");

  const topics = await Topic.find({ workspaceId: workspace._id }).select("_id").lean();
  contact.topics = topics.map((t) => ({ topicId: t._id, subscribed: formData.get(`topic_${t._id}`) === "on" })) as never;
  await contact.save();
  emitEvent(String(workspace._id), "contact.updated", serializeContact(contact)).catch(() => {});
  refresh();
  return { ok: true, message: "Contact saved." };
}

export async function deleteContactAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return;
  const c = await Contact.findOneAndDelete({ _id: id, workspaceId: workspace._id });
  if (c) emitEvent(String(workspace._id), "contact.deleted", { id: String(c._id), email: c.email }).catch(() => {});
  refresh();
}

export async function bulkContactsAction(contactIds: string[], op: "delete" | "unsubscribe" | "subscribe" | "add_segment" | "remove_segment", segmentId?: string): Promise<AudienceState> {
  const workspace = await ctx();
  const valid = contactIds.filter(isValidObjectId).slice(0, 1000);
  if (!valid.length) return { ok: false, error: "Select at least one contact." };
  const filter = { _id: { $in: valid }, workspaceId: workspace._id };
  if (op === "delete") await Contact.deleteMany(filter);
  else if (op === "unsubscribe") await Contact.updateMany(filter, { $set: { unsubscribed: true, unsubscribedAt: new Date() } });
  else if (op === "subscribe") await Contact.updateMany(filter, { $set: { unsubscribed: false } });
  else {
    if (!segmentId || !(await ownedSegments(workspace._id, [segmentId])).length) return { ok: false, error: "Choose a segment." };
    await Contact.updateMany(filter, op === "add_segment" ? { $addToSet: { segmentIds: segmentId } } : { $pull: { segmentIds: segmentId } });
  }
  refresh();
  return { ok: true, message: `Updated ${valid.length} contact${valid.length === 1 ? "" : "s"}.` };
}

/**
 * CSV import. Recognised columns: email (required), first_name, last_name,
 * unsubscribed, plus any column whose header matches a contact property key.
 * Unknown columns are ignored; invalid emails are skipped and reported.
 */
export async function importContactsAction(_prev: AudienceState, formData: FormData): Promise<AudienceState> {
  const workspace = await ctx();
  const file = formData.get("file");
  let text = "";
  if (file && typeof file === "object" && "text" in file && (file as File).size > 0) {
    if ((file as File).size > 10 * 1024 * 1024) return { ok: false, error: "CSV files can be at most 10 MB." };
    text = await (file as File).text();
  } else {
    // Pasted list fallback: emails separated by commas/newlines.
    const pasted = String(formData.get("pasted") ?? "").trim();
    if (!pasted) return { ok: false, error: "Choose a CSV file or paste email addresses." };
    text = "email\n" + pasted.split(/[\s,;]+/).filter(Boolean).join("\n");
  }

  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: "The CSV needs a header row and at least one contact." };
  const header = rows[0].map(headerKey);
  const emailCol = header.findIndex((h) => h === "email" || h === "email_address" || h === "e_mail");
  if (emailCol === -1) return { ok: false, error: "No \"email\" column found in the header row." };
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const firstCol = col(["first_name", "firstname", "first", "given_name"]);
  const lastCol = col(["last_name", "lastname", "last", "surname", "family_name"]);
  const unsubCol = col(["unsubscribed", "unsubscribe"]);
  const props = await ContactProperty.find({ workspaceId: workspace._id }).lean();
  const propCols = props.map((p) => ({ p, i: header.indexOf(p.key) })).filter((x) => x.i >= 0);
  const segmentIds = await ownedSegments(workspace._id, ids(formData, "segmentIds"));

  let created = 0;
  let updated = 0;
  let invalid = 0;
  const seen = new Set<string>();
  for (const r of rows.slice(1, 50_001)) {
    const email = normalizeEmail(r[emailCol] ?? "");
    if (!email) {
      invalid++;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    const properties: Record<string, unknown> = {};
    for (const { p, i } of propCols) if (r[i]?.trim()) properties[p.key] = coerce(r[i].trim(), p.type);
    const unsubRaw = unsubCol >= 0 ? (r[unsubCol] ?? "").trim().toLowerCase() : "";
    const res = await upsertContact(workspace._id, {
      email,
      firstName: firstCol >= 0 ? r[firstCol] : undefined,
      lastName: lastCol >= 0 ? r[lastCol] : undefined,
      unsubscribed: unsubRaw ? ["true", "1", "yes", "y"].includes(unsubRaw) : undefined,
      properties,
      segmentIds,
      source: "import",
    });
    if (res.created) created++;
    else updated++;
  }
  refresh();
  return {
    ok: true,
    message: `Imported ${created.toLocaleString()} new contact${created === 1 ? "" : "s"}, updated ${updated.toLocaleString()}${invalid ? `, skipped ${invalid.toLocaleString()} invalid row${invalid === 1 ? "" : "s"}` : ""}.`,
  };
}

function coerce(raw: string, type: string): unknown {
  if (type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : raw;
  }
  if (type === "boolean") return ["true", "1", "yes", "y", "on"].includes(raw.toLowerCase());
  if (type === "date") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toISOString();
  }
  return raw.slice(0, 500);
}

// ── Segments ──────────────────────────────────────────────
export async function createSegmentAction(_prev: AudienceState, formData: FormData): Promise<AudienceState> {
  const workspace = await ctx();
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 80) return { ok: false, error: "Segment name must be 1–80 characters." };
  const max = limitsFor(workspace.plan).segments;
  if ((await Segment.countDocuments({ workspaceId: workspace._id })) >= max) return { ok: false, error: `Your plan allows ${max} segments. Upgrade to create more.` };
  await Segment.create({ workspaceId: workspace._id, name, description: String(formData.get("description") ?? "").trim().slice(0, 300) });
  refresh();
  return { ok: true, message: "Segment created." };
}

export async function renameSegmentAction(id: string, name: string): Promise<AudienceState> {
  const workspace = await ctx();
  const n = name.trim();
  if (!isValidObjectId(id) || !n || n.length > 80) return { ok: false, error: "Segment name must be 1–80 characters." };
  await Segment.updateOne({ _id: id, workspaceId: workspace._id }, { $set: { name: n } });
  refresh();
  return { ok: true };
}

export async function deleteSegmentAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return;
  const s = await Segment.findOneAndDelete({ _id: id, workspaceId: workspace._id });
  if (s) await Contact.updateMany({ workspaceId: workspace._id, segmentIds: s._id }, { $pull: { segmentIds: s._id } });
  refresh();
}

// ── Properties ────────────────────────────────────────────
export async function createPropertyAction(_prev: AudienceState, formData: FormData): Promise<AudienceState> {
  const workspace = await ctx();
  const key = headerKey(String(formData.get("key") ?? ""));
  const type = String(formData.get("type") ?? "string") as "string" | "number" | "boolean" | "date";
  if (!/^[a-z][a-z0-9_]{0,49}$/.test(key)) return { ok: false, error: "Keys must start with a letter and use only letters, numbers and _." };
  if (["email", "first_name", "last_name", "unsubscribed", "id"].includes(key)) return { ok: false, error: `"${key}" is a built-in field.` };
  if (!["string", "number", "boolean", "date"].includes(type)) return { ok: false, error: "Choose a type." };
  try {
    await ContactProperty.create({
      workspaceId: workspace._id,
      key,
      label: String(formData.get("label") ?? "").trim() || key,
      type,
      fallback: String(formData.get("fallback") ?? "").slice(0, 200),
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return { ok: false, error: `A property with key "${key}" already exists.` };
    throw e;
  }
  refresh();
  return { ok: true, message: "Property added." };
}

export async function deletePropertyAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return;
  const p = await ContactProperty.findOneAndDelete({ _id: id, workspaceId: workspace._id });
  if (p) await Contact.updateMany({ workspaceId: workspace._id }, { $unset: { [`properties.${p.key}`]: 1 } });
  refresh();
}

// ── Topics ────────────────────────────────────────────────
export async function saveTopicAction(_prev: AudienceState, formData: FormData): Promise<AudienceState> {
  const workspace = await ctx();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || name.length > 80) return { ok: false, error: "Topic name must be 1–80 characters." };
  const data = {
    name,
    description: String(formData.get("description") ?? "").trim().slice(0, 300),
    defaultSubscribed: formData.get("defaultSubscription") !== "opt_out",
    visibility: (formData.get("visibility") === "private" ? "private" : "public") as "public" | "private",
  };
  if (id && isValidObjectId(id)) await Topic.updateOne({ _id: id, workspaceId: workspace._id }, { $set: data });
  else await Topic.create({ workspaceId: workspace._id, ...data });
  refresh();
  return { ok: true, message: id ? "Topic saved." : "Topic created." };
}

export async function deleteTopicAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return;
  const t = await Topic.findOneAndDelete({ _id: id, workspaceId: workspace._id });
  if (t) await Contact.updateMany({ workspaceId: workspace._id }, { $pull: { topics: { topicId: t._id } } });
  refresh();
}
