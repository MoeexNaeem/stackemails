import "server-only";
import { createElement } from "react";
import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { EmailLog, Membership, User, Workspace } from "@/lib/db/models";
import { env } from "@/lib/env";

/**
 * Abuse protection: throwaway-address signups, per-owner limits, and an
 * automatic brake that restricts a sender (and every team its owner runs) as
 * soon as bounces or complaints spike, before SES penalises the whole account.
 */

// Disposable / throwaway inbox providers. Subdomains match too (x.netflows.us).
const DISPOSABLE = new Set([
  "netflows.us", "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "grr.la", "10minutemail.com",
  "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net", "tempmailo.com", "temp-mail.io", "yopmail.com", "yopmail.net",
  "getnada.com", "nada.email", "trashmail.com", "trashmail.de", "dispostable.com", "maildrop.cc", "throwawaymail.com", "mohmal.com",
  "emailondeck.com", "moakt.com", "tempr.email", "mail.tm", "mailto.plus", "fexpost.com", "fexbox.org", "mailbox.in.ua", "spamgourmet.com",
  "mintemail.com", "mytemp.email", "tmpmail.org", "tmpmail.net", "tmail.ws", "burnermail.io", "inboxkitten.com", "getairmail.com",
  "emailfake.com", "fakeinbox.com", "fakemail.net", "luxusmail.org", "dropmail.me", "10mail.org", "spambox.us", "mailnesia.com",
  "mailcatch.com", "byom.de", "einrot.com", "cuvox.de", "armyspy.com", "dayrep.com", "fleckens.hu", "gustr.com", "jourrapide.com",
  "rhyta.com", "superrito.com", "teleworm.us", "mvrht.net", "harakirimail.com", "anonbox.net", "mailpoof.com", "33mail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = String(email).toLowerCase().split("@")[1] ?? "";
  const parts = domain.split(".");
  for (let i = 0; i <= parts.length - 2; i++) if (DISPOSABLE.has(parts.slice(i).join("."))) return true;
  return false;
}

/** Free accounts: how many teams one person may own, and domains across all their teams. */
export const FREE_MAX_OWNED_TEAMS = 2;
export const FREE_MAX_DOMAINS_PER_OWNER = 2;

/** True when any team this user owns is on a paid plan (paid customers get the higher limits). */
export async function ownerHasPaidPlan(userId: Types.ObjectId | string): Promise<boolean> {
  const owned = await Membership.find({ userId, role: "owner" }).select("workspaceId").lean();
  if (!owned.length) return false;
  return Boolean(await Workspace.exists({ _id: { $in: owned.map((m) => m.workspaceId) }, plan: { $ne: "free" } }));
}

// Reputation brake thresholds (SES reviews accounts at 5% bounces / 0.1% complaints).
const WINDOW_MS = 24 * 3600_000;
const MIN_SAMPLE = 20;
const MAX_BOUNCE_RATE = 0.05;
const MAX_COMPLAINT_RATE = 0.003;

/**
 * Called after every bounce or complaint. If the team's last-24h bounce or
 * complaint rate is over the limit, restrict it and every other team owned by
 * the same person, and alert the platform admin.
 */
export async function enforceSenderReputation(workspaceId: Types.ObjectId | string): Promise<{ restricted: boolean; reason?: string }> {
  await connectToDatabase();
  const ws = await Workspace.findById(workspaceId).select("status ownerId name").lean();
  if (!ws || ws.status !== "active") return { restricted: false };

  const since = new Date(Date.now() - WINDOW_MS);
  const [row] = await EmailLog.aggregate<{ total: number; bounced: number; complained: number }>([
    { $match: { workspaceId: ws._id, createdAt: { $gte: since }, status: { $nin: ["queued", "scheduled", "canceled"] } } },
    { $group: { _id: null, total: { $sum: 1 }, bounced: { $sum: { $cond: [{ $eq: ["$status", "bounced"] }, 1, 0] } }, complained: { $sum: { $cond: [{ $eq: ["$status", "complained"] }, 1, 0] } } } },
  ]);
  if (!row || row.total < MIN_SAMPLE) return { restricted: false };
  const bounceRate = row.bounced / row.total;
  const complaintRate = row.complained / row.total;
  if (bounceRate < MAX_BOUNCE_RATE && complaintRate < MAX_COMPLAINT_RATE) return { restricted: false };

  const reason =
    bounceRate >= MAX_BOUNCE_RATE
      ? `Sending paused automatically: ${(bounceRate * 100).toFixed(1)}% of your emails bounced in the last 24 hours. Clean your list and contact support@stackemails.com to resume.`
      : `Sending paused automatically: ${(complaintRate * 100).toFixed(2)}% of recipients reported your emails as spam in the last 24 hours. Contact support@stackemails.com to resume.`;

  // Restrict every active team this owner runs, so spreading spam across teams doesn't help.
  const owned = await Membership.find({ userId: ws.ownerId, role: "owner" }).select("workspaceId").lean();
  const ids = owned.map((m) => m.workspaceId);
  const res = await Workspace.updateMany({ _id: { $in: ids.length ? ids : [ws._id] }, status: "active" }, { $set: { status: "restricted", restrictedReason: reason } });
  // Drop anything still waiting to send from those teams.
  await EmailLog.updateMany({ workspaceId: { $in: ids.length ? ids : [ws._id] }, status: { $in: ["queued", "scheduled"] } }, { $set: { status: "canceled", errorMessage: "Canceled: sending paused for reputation." } });

  const owner = await User.findById(ws.ownerId).select("email").lean();
  console.warn(`[abuse] restricted ${res.modifiedCount} team(s) of ${owner?.email}: bounce ${(bounceRate * 100).toFixed(1)}%, complaints ${(complaintRate * 100).toFixed(2)}% over ${row.total} emails`);
  try {
    const [{ sendSystemEmail }, { NoticeEmail }] = await Promise.all([import("@/lib/email/system"), import("@/emails/system")]);
    await sendSystemEmail({
      kind: "account_notice",
      to: env.supportEmail,
      subject: `Auto-restricted: ${owner?.email ?? "unknown"} (${(bounceRate * 100).toFixed(1)}% bounces)`,
      react: createElement(NoticeEmail, {
        heading: "A sender was paused automatically",
        paragraphs: [
          `Owner: ${owner?.email ?? "unknown"} · team "${ws.name}" · ${res.modifiedCount} team(s) restricted.`,
          `Last 24h: ${row.total} emails, ${row.bounced} bounced (${(bounceRate * 100).toFixed(1)}%), ${row.complained} complaints.`,
          "Review it in Admin > Teams & users before lifting the restriction.",
        ],
        cta: { label: "Open admin", href: `${env.appUrl}/admin/users` },
      }),
    });
  } catch (err) {
    console.error("[abuse] admin alert failed", err);
  }
  return { restricted: true, reason };
}
