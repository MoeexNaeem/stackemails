"use server";

import { createElement } from "react";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import QRCode from "qrcode";
import { requireDashboardContext } from "@/lib/auth/context";
import { roleIn, ACTIVE_WS_COOKIE } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import * as M from "@/lib/db/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroySession } from "@/lib/auth/session";
import { sha256 } from "@/lib/crypto";
import { normalizeEmail } from "@/lib/contacts";
import { getRateLimiter } from "@/lib/ratelimit";
import { sendSystemEmail } from "@/lib/email/system";
import { InviteEmail, NoticeEmail } from "@/emails/system";
import { decryptSecret, encryptSecret, generateRecoveryCodes, generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/auth/totp";
import { purgeWorkspace } from "@/lib/workspace-purge";
import { limitsFor } from "@/lib/plans";
import { env } from "@/lib/env";

export type SettingsState = { ok: boolean; error?: string; message?: string; data?: Record<string, unknown> };
const ok = (message?: string, data?: Record<string, unknown>): SettingsState => ({ ok: true, message, data });
const fail = (error: string): SettingsState => ({ ok: false, error });

async function ctx() {
  const c = await requireDashboardContext();
  await connectToDatabase();
  const role = await roleIn(c.user._id, c.workspace._id);
  return { ...c, role };
}
const canManage = (role: string | null) => role === "owner" || role === "admin";

// ── Team ──────────────────────────────────────────────────
export async function renameTeamAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { workspace, role } = await ctx();
  if (!canManage(role)) return fail("Only team owners and admins can rename the team.");
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) return fail("Team name must be 2–80 characters.");
  await M.Workspace.updateOne({ _id: workspace._id }, { $set: { name } });
  revalidatePath("/", "layout");
  return ok("Team name saved.");
}

export async function inviteMemberAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { workspace, user, role } = await ctx();
  if (!canManage(role)) return fail("Only team owners and admins can invite members.");
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  const inviteRole = fd.get("role") === "admin" ? "admin" : "member";
  if (!email) return fail("Enter a valid email address.");
  const maxMembers = limitsFor(workspace.plan).members;
  const seats = (await M.Membership.countDocuments({ workspaceId: workspace._id })) + (await M.Invitation.countDocuments({ workspaceId: workspace._id, acceptedAt: { $exists: false }, email: { $ne: email } }));
  if (seats >= maxMembers) return fail(`Your plan includes ${maxMembers} team members. Upgrade to invite more.`);
  const rl = await getRateLimiter().check(`invite:${workspace._id}`, 20, 3600_000);
  if (!rl.allowed) return fail("Too many invitations sent this hour.");

  const existingUser = await M.User.findOne({ email }).select("_id").lean();
  if (existingUser && (await M.Membership.exists({ workspaceId: workspace._id, userId: existingUser._id }))) return fail("That person is already on this team.");

  const raw = randomBytes(32).toString("hex");
  await M.Invitation.deleteMany({ workspaceId: workspace._id, email, acceptedAt: { $exists: false } });
  await M.Invitation.create({ workspaceId: workspace._id, email, role: inviteRole, tokenHash: sha256(raw), invitedBy: user._id, expiresAt: new Date(Date.now() + 7 * 86_400_000) });
  const res = await sendSystemEmail({
    kind: "invite",
    to: email,
    subject: `${user.name} invited you to ${workspace.name} on Stack Emails`,
    react: createElement(InviteEmail, { inviter: user.name, team: workspace.name, role: inviteRole, acceptUrl: `${env.appUrl}/invite/${raw}` }),
  });
  revalidatePath("/settings/team");
  return res.ok ? ok(`Invitation sent to ${email}.`) : ok(`Invitation created, but the email couldn't be sent (${res.error}). Share this link: ${env.appUrl}/invite/${raw}`);
}

export async function revokeInviteAction(id: string): Promise<void> {
  const { workspace, role } = await ctx();
  if (!canManage(role) || !isValidObjectId(id)) return;
  await M.Invitation.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/settings/team");
}

export async function changeMemberRoleAction(membershipId: string, newRole: "admin" | "member"): Promise<SettingsState> {
  const { workspace, role } = await ctx();
  if (role !== "owner") return fail("Only the team owner can change roles.");
  if (!isValidObjectId(membershipId)) return fail("Member not found.");
  const m = await M.Membership.findOne({ _id: membershipId, workspaceId: workspace._id });
  if (!m) return fail("Member not found.");
  if (m.role === "owner") return fail("The owner's role can't be changed.");
  m.role = newRole === "admin" ? "admin" : "member";
  await m.save();
  revalidatePath("/settings/team");
  return ok("Role updated.");
}

export async function removeMemberAction(membershipId: string): Promise<SettingsState> {
  const { workspace, user, role } = await ctx();
  if (!isValidObjectId(membershipId)) return fail("Member not found.");
  const m = await M.Membership.findOne({ _id: membershipId, workspaceId: workspace._id });
  if (!m) return fail("Member not found.");
  const self = String(m.userId) === String(user._id);
  if (m.role === "owner") return fail("The owner can't be removed. Transfer ownership or delete the team.");
  if (!self && !canManage(role)) return fail("Only owners and admins can remove members.");
  await m.deleteOne();
  revalidatePath("/settings/team");
  if (self) {
    (await cookies()).delete(ACTIVE_WS_COOKIE);
    redirect("/overview");
  }
  return ok("Member removed.");
}

export async function deleteTeamAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { workspace, user, role } = await ctx();
  if (role !== "owner") return fail("Only the team owner can delete the team.");
  if (String(fd.get("confirm") ?? "").trim() !== workspace.name) return fail(`Type “${workspace.name}” to confirm.`);
  const owned = await M.Membership.countDocuments({ userId: user._id });
  if (owned <= 1) return fail("This is your only team. Create another team first, or delete your account from your profile.");
  await purgeWorkspace(workspace._id);
  (await cookies()).delete(ACTIVE_WS_COOKIE);
  redirect("/overview");
}

// ── Profile & security ───────────────────────────────────
export async function updateNameAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { user } = await ctx();
  const name = String(fd.get("name") ?? "").trim();
  if (!name || name.length > 80) return fail("Name must be 1–80 characters.");
  await M.User.updateOne({ _id: user._id }, { $set: { name } });
  revalidatePath("/", "layout");
  return ok("Name saved.");
}

export async function changeEmailAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { user } = await ctx();
  const email = normalizeEmail(String(fd.get("email") ?? ""));
  const password = String(fd.get("password") ?? "");
  if (!email) return fail("Enter a valid email address.");
  const full = await M.User.findById(user._id);
  if (!full || !(await verifyPassword(password, full.passwordHash))) return fail("Your current password is incorrect.");
  if (email === full.email) return fail("That's already your email.");
  if (await M.User.exists({ email })) return fail("That email is already in use.");
  const old = full.email;
  full.email = email;
  await full.save();
  await sendSystemEmail({ kind: "account_notice", to: old, subject: "Your Stack Emails email address was changed", react: createElement(NoticeEmail, { heading: "Your sign-in email changed", paragraphs: [`The email on your Stack Emails account was changed from ${old} to ${email}.`, "If you didn't do this, reset your password immediately and contact support@stackemails.com."] }) });
  revalidatePath("/profile");
  return ok("Email updated. We notified your previous address.");
}

export async function changePasswordAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { user } = await ctx();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (next.length < 8 || next.length > 200) return fail("New password must be at least 8 characters.");
  if (next !== String(fd.get("confirm") ?? "")) return fail("New passwords don't match.");
  const full = await M.User.findById(user._id);
  if (!full || !(await verifyPassword(current, full.passwordHash))) return fail("Your current password is incorrect.");
  full.passwordHash = await hashPassword(next);
  await full.save();
  // Sign out every other session (keep this one).
  const store = await cookies();
  const raw = store.get("stackemails_session")?.value;
  await M.Session.deleteMany({ userId: full._id, ...(raw ? { tokenHash: { $ne: sha256(raw) } } : {}) });
  await sendSystemEmail({ kind: "account_notice", to: full.email, subject: "Your Stack Emails password was changed", react: createElement(NoticeEmail, { heading: "Password changed", paragraphs: ["Your password was changed and all other sessions were signed out.", "If you didn't do this, reset your password now."] }) });
  return ok("Password changed. Other devices were signed out.");
}

export async function signOutOtherSessionsAction(): Promise<SettingsState> {
  const { user } = await ctx();
  const raw = (await cookies()).get("stackemails_session")?.value;
  const r = await M.Session.deleteMany({ userId: user._id, ...(raw ? { tokenHash: { $ne: sha256(raw) } } : {}) });
  revalidatePath("/profile");
  return ok(`Signed out ${r.deletedCount} other session${r.deletedCount === 1 ? "" : "s"}.`);
}

export async function startMfaSetupAction(): Promise<SettingsState> {
  const { user } = await ctx();
  const secret = generateTotpSecret();
  await M.User.updateOne({ _id: user._id }, { $set: { mfaPendingSecret: encryptSecret(secret) } });
  const url = otpauthUrl(secret, user.email);
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: "#15171a", light: "#ffffff" } });
  return ok(undefined, { secret, qr });
}

export async function confirmMfaAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { user } = await ctx();
  const code = String(fd.get("code") ?? "").replace(/\s/g, "");
  const full = await M.User.findById(user._id).select("+mfaPendingSecret");
  if (!full?.mfaPendingSecret) return fail("Start setup again.");
  const secret = decryptSecret(full.mfaPendingSecret);
  const counter = verifyTotp(secret, code);
  if (counter === null) return fail("That code doesn't match. Check the time on your phone and try again.");
  const { plain, hashes } = generateRecoveryCodes();
  await M.User.updateOne({ _id: user._id }, { $set: { mfaEnabled: true, mfaSecret: full.mfaPendingSecret, mfaLastCounter: counter, mfaRecoveryHashes: hashes }, $unset: { mfaPendingSecret: 1 } });
  revalidatePath("/profile");
  return ok("Two-factor authentication is on. Save your recovery codes somewhere safe.", { recoveryCodes: plain });
}

export async function disableMfaAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { user } = await ctx();
  const full = await M.User.findById(user._id);
  if (!full || !(await verifyPassword(String(fd.get("password") ?? ""), full.passwordHash))) return fail("Your password is incorrect.");
  await M.User.updateOne({ _id: user._id }, { $set: { mfaEnabled: false, mfaRecoveryHashes: [] }, $unset: { mfaSecret: 1, mfaPendingSecret: 1 } });
  revalidatePath("/profile");
  return ok("Two-factor authentication turned off.");
}

export async function deleteAccountAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { user } = await ctx();
  const full = await M.User.findById(user._id);
  if (!full || !(await verifyPassword(String(fd.get("password") ?? ""), full.passwordHash))) return fail("Your password is incorrect.");
  if (String(fd.get("confirm") ?? "").trim().toLowerCase() !== full.email) return fail(`Type your email (${full.email}) to confirm.`);
  if (full.platformRole === "admin") return fail("Platform admin accounts can't be deleted here.");
  const memberships = await M.Membership.find({ userId: full._id }).lean();
  for (const m of memberships) {
    if (m.role === "owner") {
      const others = await M.Membership.countDocuments({ workspaceId: m.workspaceId, userId: { $ne: full._id } });
      if (others > 0) return fail("Transfer or delete teams that have other members before deleting your account.");
    }
  }
  for (const m of memberships) {
    if (m.role === "owner") await purgeWorkspace(m.workspaceId);
    else await M.Membership.deleteOne({ _id: m._id });
  }
  await M.Session.deleteMany({ userId: full._id });
  await M.PasswordResetToken.deleteMany({ userId: full._id });
  await full.deleteOne();
  await destroySession();
  redirect("/?account=deleted");
}

// ── Workspace preferences ─────────────────────────────────
export async function saveUnsubscribePageAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { workspace, role } = await ctx();
  if (!canManage(role)) return fail("Only owners and admins can change this.");
  const color = String(fd.get("brandColor") ?? "#15171a");
  await M.Workspace.updateOne(
    { _id: workspace._id },
    {
      $set: {
        "unsubscribePage.heading": String(fd.get("heading") ?? "").slice(0, 120) || "Do you want to unsubscribe?",
        "unsubscribePage.message": String(fd.get("message") ?? "").slice(0, 500),
        "unsubscribePage.confirmation": String(fd.get("confirmation") ?? "").slice(0, 500),
        "unsubscribePage.brandColor": /^#[0-9a-f]{6}$/i.test(color) ? color : "#15171a",
        "unsubscribePage.showTopics": fd.get("showTopics") === "on",
      },
    },
  );
  revalidatePath("/settings/unsubscribe-page");
  return ok("Unsubscribe page saved.");
}

export async function setLabsFlagAction(flag: "inboxes" | "assistant", value: boolean): Promise<SettingsState> {
  const { workspace, role } = await ctx();
  if (!canManage(role)) return fail("Only owners and admins can change Labs settings.");
  await M.Workspace.updateOne({ _id: workspace._id }, { $set: { [`labs.${flag}`]: value } });
  revalidatePath("/", "layout");
  return ok("Saved.");
}

export async function setBillingEmailAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  const { workspace, role } = await ctx();
  if (!canManage(role)) return fail("Only owners and admins can change billing.");
  const raw = String(fd.get("email") ?? "").trim();
  const email = raw ? normalizeEmail(raw) : "";
  if (raw && !email) return fail("Enter a valid email address.");
  await M.Workspace.updateOne({ _id: workspace._id }, { $set: { billingEmail: email } });
  revalidatePath("/settings/billing");
  return ok("Billing email saved.");
}
