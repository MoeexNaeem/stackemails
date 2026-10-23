import { connectToDatabase } from "@/lib/db/connect";
import { Broadcast, Contact, Topic, Workspace, type BroadcastDoc } from "@/lib/db/models";
import { createAndQueueEmail } from "@/lib/email/send";
import { assertSenderAllowed } from "@/lib/email/guards";
import { isSubscribedToTopic, listUnsubscribeHeaders, propertiesFor, renderMergeTags, unsubscribeUrls } from "@/lib/contacts";
import { sentThisPeriod, sentToday } from "@/lib/quota";
import type { HydratedDocument, Types } from "mongoose";

export type BroadcastResult = { ok: true; queued: number; skipped: number } | { ok: false; error: string };

/** Hidden inbox preview line (preheader), placed first in the body. */
function withPreheader(html: string, text: string): string {
  if (!text) return html;
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pre = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc}${"&#8199;&#847; ".repeat(40)}</div>`;
  return /<body[^>]*>/i.test(html) ? html.replace(/<body([^>]*)>/i, `<body$1>${pre}`) : pre + html;
}

const FOOTER = (url: string) =>
  `<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font:12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#94a3b8;text-align:center">You're receiving this because you subscribed. <a href="${url}" style="color:#64748b">Unsubscribe</a></div>`;

/**
 * Fan a broadcast out to every eligible contact in its segment:
 *  - skips unsubscribed contacts and those opted out of the broadcast's topic
 *  - personalises merge tags per contact ({{first_name}}, {{contact.key}}, …)
 *  - adds a visible unsubscribe link + RFC 8058 one-click List-Unsubscribe headers
 *  - checks the team's remaining daily/monthly quota once up front
 */
export async function sendBroadcast(bc: HydratedDocument<BroadcastDoc>): Promise<BroadcastResult> {
  await connectToDatabase();
  const workspace = await Workspace.findById(bc.workspaceId);
  if (!workspace) return { ok: false, error: "Team not found." };
  if (!bc.audienceId) return { ok: false, error: "Choose a segment first." };
  if (!bc.from || !bc.subject || !bc.html) return { ok: false, error: "From, subject and content are required." };

  const sender = await assertSenderAllowed(workspace._id, bc.from);
  if (!sender.ok) return { ok: false, error: sender.message };

  const topic = bc.topicId ? await Topic.findOne({ _id: bc.topicId, workspaceId: workspace._id }).lean() : null;
  const props = await propertiesFor(workspace._id);

  const remaining = Math.min(
    workspace.monthlyQuota - sentThisPeriod(workspace),
    workspace.dailyQuota - sentToday(workspace),
  );
  if (remaining <= 0) return { ok: false, error: "Your team has reached its sending quota. Upgrade or wait for the quota to reset." };

  const eligibleFilter = { workspaceId: workspace._id, segmentIds: bc.audienceId as Types.ObjectId, unsubscribed: { $ne: true } };
  const eligible = await Contact.countDocuments(eligibleFilter);
  if (eligible > remaining) {
    return { ok: false, error: `This segment has ${eligible.toLocaleString()} subscribed contacts but your team can send only ${remaining.toLocaleString()} more emails right now.` };
  }

  bc.status = bc.scheduledAt && bc.scheduledAt.getTime() > Date.now() ? "scheduled" : "sending";
  await bc.save();

  let queued = 0;
  let skipped = 0;
  const cursor = Contact.find(eligibleFilter).cursor();
  for await (const contact of cursor) {
    if (topic && !isSubscribedToTopic(contact, topic)) {
      skipped++;
      continue;
    }
    const urls = unsubscribeUrls(contact._id);
    const extra = { unsubscribe_url: urls.page };
    let html = withPreheader(renderMergeTags(bc.html, contact, props, extra, { html: true }), renderMergeTags(bc.previewText ?? "", contact, props, extra));
    if (!/\{\{\{?\s*unsubscribe_url/i.test(bc.html)) {
      html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${FOOTER(urls.page)}</body>`) : html + FOOTER(urls.page);
    }
    const res = await createAndQueueEmail(workspace, {
      from: bc.from,
      to: [contact.email],
      replyTo: bc.replyTo ? [bc.replyTo] : undefined,
      subject: renderMergeTags(bc.subject, contact, props, extra),
      html,
      text: undefined,
      headers: listUnsubscribeHeaders(contact._id),
      tags: [{ name: "broadcast_id", value: String(bc._id) }],
      scheduledAt: bc.scheduledAt ?? null,
      source: "broadcast",
      broadcastId: bc._id,
      contactId: contact._id,
      prechecked: true,
    });
    if (res.ok) queued++;
    else skipped++;
  }

  bc.status = bc.status === "scheduled" ? "scheduled" : "sent";
  bc.sentAt = bc.status === "sent" ? new Date() : undefined;
  bc.stats = { recipients: queued, delivered: 0, opened: 0, clicked: 0 };
  await bc.save();
  return { ok: true, queued, skipped };
}

/** Recompute delivered/opened/clicked counters for a broadcast from its emails. */
export async function refreshBroadcastStats(broadcastId: Types.ObjectId | string) {
  const { EmailLog } = await import("@/lib/db/models");
  const [agg] = await EmailLog.aggregate([
    { $match: { broadcastId: typeof broadcastId === "string" ? new (await import("mongoose")).Types.ObjectId(broadcastId) : broadcastId } },
    {
      $group: {
        _id: null,
        recipients: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered"]] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $gt: ["$opens", 0] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $gt: ["$clicks", 0] }, 1, 0] } },
      },
    },
  ]);
  if (agg) await Broadcast.updateOne({ _id: broadcastId }, { $set: { stats: { recipients: agg.recipients, delivered: agg.delivered, opened: agg.opened, clicked: agg.clicked } } });
}
