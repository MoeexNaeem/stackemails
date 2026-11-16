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

export { FREE_MAX_DOMAINS_PER_OWNER, FREE_MAX_OWNED_TEAMS, isDisposableEmail } from "@/lib/abuse-rules";

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

/**
 * A not-yet-approved account tried to add a sending domain: tell the admin
 * (at most once a day per account) so they can approve or suspend it.
 */
export async function requestAccountReview(user: { _id: Types.ObjectId; email: string; name?: string }, domain: string): Promise<void> {
  try {
    await connectToDatabase();
    await User.updateOne({ _id: user._id }, { $set: { reviewRequestedAt: new Date(), reviewDomain: domain.slice(0, 253) } });
    const { getRateLimiter } = await import("@/lib/ratelimit");
    const gate = await getRateLimiter().check(`review-alert:${user._id}`, 1, 24 * 3600_000);
    if (!gate.allowed) return;
    const [{ sendSystemEmail }, { NoticeEmail }] = await Promise.all([import("@/lib/email/system"), import("@/emails/system")]);
    await sendSystemEmail({
      kind: "account_notice",
      to: env.supportEmail,
      subject: `Review: ${user.email} wants to add ${domain}`,
      react: createElement(NoticeEmail, {
        heading: "An account is waiting for approval",
        paragraphs: [
          `${user.email} (${user.name ?? "no name"}) tried to add the sending domain ${domain}.`,
          "Approve it only if it looks like a real business: a real website on that domain, a name and email that match it. Bots use random Outlook/Hotmail addresses and other people's small-business domains.",
        ],
        cta: { label: "Review accounts", href: `${env.appUrl}/admin/review` },
      }),
    });
  } catch (err) {
    console.error("[abuse] review alert failed", err);
  }
}

// Signup surge alarm: a normal day has a handful of signups; a wave means a bot run.
const SURGE_WINDOW_MS = 3600_000;
const SURGE_THRESHOLD = 15;

/**
 * Called after every signup. If more than SURGE_THRESHOLD accounts were created
 * in the last hour, email the platform admin (at most once every 6 hours).
 */
export async function watchSignupSurge(ip: string): Promise<void> {
  try {
    await connectToDatabase();
    const since = new Date(Date.now() - SURGE_WINDOW_MS);
    const recent = await User.countDocuments({ createdAt: { $gte: since } });
    if (recent < SURGE_THRESHOLD) return;
    const { getRateLimiter } = await import("@/lib/ratelimit");
    const gate = await getRateLimiter().check("alert:signup-surge", 1, 6 * 3600_000);
    if (!gate.allowed) return;
    const latest = await User.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(15).select("email lastLoginIp").lean();
    const domains = new Map<string, number>();
    for (const u of latest) {
      const d = u.email.split("@")[1] ?? "?";
      domains.set(d, (domains.get(d) ?? 0) + 1);
    }
    console.warn(`[abuse] signup surge: ${recent} accounts in the last hour (latest ip ${ip})`);
    const [{ sendSystemEmail }, { NoticeEmail }] = await Promise.all([import("@/lib/email/system"), import("@/emails/system")]);
    await sendSystemEmail({
      kind: "account_notice",
      to: env.supportEmail,
      subject: `Signup surge: ${recent} new accounts in the last hour`,
      react: createElement(NoticeEmail, {
        heading: "Unusual number of signups",
        paragraphs: [
          `${recent} accounts were created in the last hour. That's well above normal and usually means a bot or spam run.`,
          `Email domains among the latest: ${[...domains].map(([d, n]) => `${d} (${n})`).join(", ")}.`,
          "New accounts can't add domains until they confirm their email, so nothing can be sent yet. Review them in Admin > Teams & users, and add any throwaway domain to the blocklist.",
        ],
        cta: { label: "Open admin", href: `${env.appUrl}/admin/users` },
      }),
    });
  } catch (err) {
    console.error("[abuse] signup surge check failed", err);
  }
}
