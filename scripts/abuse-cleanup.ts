/**
 * Find and shut down abusive accounts (throwaway-email signups, or free users
 * owning more teams than the free limit). Dry run by default.
 *
 *   npx tsx scripts/abuse-cleanup.ts            list suspects
 *   npx tsx scripts/abuse-cleanup.ts --apply    disable them
 *
 * Applying: disables the users and ends their sessions, suspends their teams,
 * revokes API keys, cancels queued email, and deletes their domains from SES and
 * the database. Platform admins are never touched.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, Domain, EmailLog, Membership, Session, User, Workspace } from "@/lib/db/models";
import { FREE_MAX_OWNED_TEAMS, isDisposableEmail } from "@/lib/abuse";
import { getEmailProvider } from "@/lib/email";

const APPLY = process.argv.includes("--apply");
const REASON = "Suspended for abuse: bulk throwaway-account signups and high-bounce sending violate the acceptable use policy.";

async function main() {
  await connectToDatabase();
  const users = await User.find({ platformRole: { $ne: "admin" } }).select("email name createdAt disabled").lean();
  const suspects: { user: (typeof users)[number]; why: string; teams: mongoose.Types.ObjectId[] }[] = [];

  for (const u of users) {
    const teams = (await Membership.find({ userId: u._id, role: "owner" }).select("workspaceId").lean()).map((m) => m.workspaceId);
    const paid = teams.length ? await Workspace.exists({ _id: { $in: teams }, plan: { $ne: "free" } }) : null;
    const why = isDisposableEmail(u.email) ? "throwaway email domain" : !paid && teams.length > FREE_MAX_OWNED_TEAMS ? `owns ${teams.length} free teams` : "";
    if (why) suspects.push({ user: u, why, teams });
  }

  let totalTeams = 0, totalDomains = 0, totalSent = 0, totalBounced = 0;
  console.log(`\n${suspects.length} suspect account(s) of ${users.length} non-admin users${APPLY ? " (APPLYING)" : " (dry run)"}\n`);
  for (const s of suspects) {
    const domains = await Domain.countDocuments({ workspaceId: { $in: s.teams } });
    const [agg] = await EmailLog.aggregate<{ sent: number; bounced: number }>([
      { $match: { workspaceId: { $in: s.teams } } },
      { $group: { _id: null, sent: { $sum: 1 }, bounced: { $sum: { $cond: [{ $eq: ["$status", "bounced"] }, 1, 0] } } } },
    ]);
    totalTeams += s.teams.length; totalDomains += domains; totalSent += agg?.sent ?? 0; totalBounced += agg?.bounced ?? 0;
    console.log(`  ${s.user.email.padEnd(45)} ${s.why.padEnd(24)} teams=${s.teams.length} domains=${domains} emails=${agg?.sent ?? 0} bounced=${agg?.bounced ?? 0}${s.user.disabled ? " [already disabled]" : ""}`);
  }
  console.log(`\nTotals: teams=${totalTeams} domains=${totalDomains} emails=${totalSent} bounced=${totalBounced}`);

  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to suspend these accounts.");
    return mongoose.disconnect();
  }

  const provider = getEmailProvider();
  for (const s of suspects) {
    await User.updateOne({ _id: s.user._id }, { $set: { disabled: true } });
    await Session.deleteMany({ userId: s.user._id });
    if (!s.teams.length) continue;
    await Workspace.updateMany({ _id: { $in: s.teams } }, { $set: { status: "suspended", restrictedReason: REASON } });
    await ApiKey.updateMany({ workspaceId: { $in: s.teams }, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    await EmailLog.updateMany({ workspaceId: { $in: s.teams }, status: { $in: ["queued", "scheduled"] } }, { $set: { status: "canceled", errorMessage: "Canceled: account suspended for abuse." } });
    const domains = await Domain.find({ workspaceId: { $in: s.teams } }).select("name region").lean();
    for (const d of domains) {
      await provider.deleteDomainIdentity?.(d.name, d.region).catch((e) => console.error(`  SES delete failed for ${d.name}: ${e.message}`));
    }
    await Domain.deleteMany({ workspaceId: { $in: s.teams } });
    console.log(`  suspended ${s.user.email}: ${s.teams.length} teams, ${domains.length} domains removed`);
  }
  console.log("\nDone.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
