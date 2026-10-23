import { simpleParser, type AddressObject } from "mailparser";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Domain, InboundEmail, Inbox, Workspace, type WorkspaceDoc } from "@/lib/db/models";
import { emitEvent } from "@/lib/webhooks/dispatch";
import { bumpStat } from "@/lib/stats";
import { prefixedId, randomId } from "@/lib/ids";
import { env } from "@/lib/env";

/** The team's receiving address domain, e.g. "buintevro.in.stackemails.com". Creates the key on first use. */
export async function receivingDomain(workspace: WorkspaceDoc): Promise<string> {
  if (!workspace.inboundKey) {
    for (let i = 0; i < 5; i++) {
      const key = randomId(9).replace(/[0-9]/g, (d) => "abcdefghij"[Number(d)]);
      const res = await Workspace.updateOne({ _id: workspace._id, inboundKey: { $exists: false } }, { $set: { inboundKey: key } }).catch(() => null);
      if (res?.modifiedCount) {
        workspace.inboundKey = key;
        break;
      }
      const fresh = await Workspace.findById(workspace._id).select("inboundKey").lean();
      if (fresh?.inboundKey) {
        workspace.inboundKey = fresh.inboundKey;
        break;
      }
    }
  }
  return `${workspace.inboundKey}.${env.inboundDomain}`;
}

function addrs(a?: AddressObject | AddressObject[]): string[] {
  const list = Array.isArray(a) ? a : a ? [a] : [];
  return list.flatMap((x) => x.value.map((v) => (v.address ?? "").toLowerCase()).filter(Boolean));
}

/** Resolve which team a recipient address belongs to. */
async function resolveRecipient(address: string): Promise<{ workspaceId: Types.ObjectId; inboxId?: Types.ObjectId } | null> {
  const at = address.lastIndexOf("@");
  if (at < 1) return null;
  const domain = address.slice(at + 1).toLowerCase();

  // Inbox match first (explicit address or receiving alias).
  const inbox = await Inbox.findOne({ $or: [{ address }, { alias: address }] }).select("_id workspaceId").lean();
  if (inbox) return { workspaceId: inbox.workspaceId, inboxId: inbox._id };

  const suffix = `.${env.inboundDomain}`;
  if (domain.endsWith(suffix)) {
    const key = domain.slice(0, -suffix.length);
    const ws = await Workspace.findOne({ inboundKey: key }).select("_id").lean();
    return ws ? { workspaceId: ws._id } : null;
  }
  // Custom domain with receiving enabled (MX points at us).
  const d = await Domain.findOne({ name: domain, receivingEnabled: true }).select("workspaceId").lean();
  return d ? { workspaceId: d.workspaceId } : null;
}

/**
 * Store an inbound MIME message for every team it's addressed to, thread it
 * with earlier messages, bump inbox unread counts and fire email.received.
 */
export async function ingestInbound(raw: Buffer | string, envelopeRecipients?: string[], verdicts?: { spam?: string; virus?: string }) {
  await connectToDatabase();
  const mail = await simpleParser(raw);
  const recipients = Array.from(new Set((envelopeRecipients?.length ? envelopeRecipients : [...addrs(mail.to), ...addrs(mail.cc)]).map((r) => r.toLowerCase())));
  const from = mail.from?.value?.[0];
  const rfcId = mail.messageId ?? undefined;
  const refs = [mail.inReplyTo, ...(Array.isArray(mail.references) ? mail.references : mail.references ? [mail.references] : [])].filter((x): x is string => !!x);
  const text = mail.text ?? "";
  const html = typeof mail.html === "string" ? mail.html : undefined;
  const stored: string[] = [];
  const seenTeams = new Set<string>();

  for (const rcpt of recipients) {
    const target = await resolveRecipient(rcpt);
    if (!target) continue;
    const teamKey = `${target.workspaceId}:${target.inboxId ?? ""}`;
    if (seenTeams.has(teamKey)) continue;
    seenTeams.add(teamKey);

    // Duplicate delivery of the same Message-ID to the same team/inbox → skip.
    if (rfcId && (await InboundEmail.exists({ workspaceId: target.workspaceId, inboxId: target.inboxId, rfcMessageId: rfcId }))) continue;

    let threadId: string | undefined;
    if (refs.length) {
      const parent = await InboundEmail.findOne({ workspaceId: target.workspaceId, rfcMessageId: { $in: refs } }).select("threadId").lean();
      threadId = parent?.threadId ?? undefined;
    }
    const doc = await InboundEmail.create({
      workspaceId: target.workspaceId,
      inboxId: target.inboxId,
      messageId: prefixedId("inb"),
      rfcMessageId: rfcId,
      inReplyTo: mail.inReplyTo,
      threadId: threadId ?? prefixedId("thr", 16),
      from: (from?.address ?? "unknown").toLowerCase(),
      fromName: from?.name ?? "",
      to: addrs(mail.to),
      cc: addrs(mail.cc),
      subject: mail.subject || "(no subject)",
      text: text.slice(0, 500_000),
      html: html?.slice(0, 1_000_000),
      snippet: text.replace(/\s+/g, " ").trim().slice(0, 160),
      attachments: mail.attachments.map((a) => ({ filename: a.filename ?? "attachment", contentType: a.contentType, size: a.size })),
      spamVerdict: verdicts?.spam ?? "",
      virusVerdict: verdicts?.virus ?? "",
      direction: "inbound",
    });
    if (target.inboxId) await Inbox.updateOne({ _id: target.inboxId }, { $inc: { unread: 1 } });
    bumpStat(target.workspaceId, "", { received: 1 });
    stored.push(doc.messageId);
    emitEvent(String(target.workspaceId), "email.received", {
      email_id: doc.messageId,
      from: doc.from,
      to: doc.to,
      subject: doc.subject,
      inbox_id: target.inboxId ? String(target.inboxId) : null,
      created_at: doc.createdAt,
    }).catch(() => {});
  }
  return stored;
}

/** Build a minimal RFC 822 message (used by "send test inbound" and tests). */
export function buildTestMime(opts: { from: string; to: string; subject: string; text: string; inReplyTo?: string }) {
  const id = `<${randomId(20)}@test.stackemails.com>`;
  return [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `Message-ID: ${id}`,
    ...(opts.inReplyTo ? [`In-Reply-To: ${opts.inReplyTo}`, `References: ${opts.inReplyTo}`] : []),
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    opts.text,
    "",
  ].join("\r\n");
}
