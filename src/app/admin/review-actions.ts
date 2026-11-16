"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connect";
import { ApiKey, EmailLog, Membership, Session, User, Workspace } from "@/lib/db/models";
import { sendSystemEmail } from "@/lib/email/system";
import { NoticeEmail } from "@/emails/system";
import { env } from "@/lib/env";

export type ReviewState = { ok: boolean; error?: string; message?: string };

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "admin" || !user.mfaEnabled) throw new Error("Not authorized");
  await connectToDatabase();
  return user;
}

/** Let this account add sending domains. */
export async function approveAccountAction(userId: string): Promise<ReviewState> {
  await requireAdminUser();
  if (!isValidObjectId(userId)) return { ok: false, error: "Account not found." };
  const u = await User.findOneAndUpdate({ _id: userId, disabled: { $ne: true } }, { $set: { sendingApprovedAt: new Date() } }, { returnDocument: "after" });
  if (!u) return { ok: false, error: "Account not found or disabled." };
  after(() =>
    sendSystemEmail({
      kind: "account_notice",
      to: u.email,
      subject: "Your Stack Emails account is approved",
      react: createElement(NoticeEmail, {
        heading: "You're approved to send",
        paragraphs: [
          u.reviewDomain ? `You can now add ${u.reviewDomain} (and other domains) and start sending.` : "You can now add your sending domain and start sending.",
          "Please only email people who asked to hear from you. Accounts with high bounce or spam-complaint rates are paused automatically.",
        ],
        cta: { label: "Add your domain", href: `${env.appUrl}/domains` },
      }),
    }),
  );
  revalidatePath("/admin/review");
  return { ok: true, message: `Approved ${u.email}.` };
}

/** Bot or spammer: disable the account, sign it out, suspend its teams. Reversible from Teams & users. */
export async function suspendAccountAction(userId: string): Promise<ReviewState> {
  const admin = await requireAdminUser();
  if (!isValidObjectId(userId) || String(admin._id) === userId) return { ok: false, error: "Account not found." };
  const u = await User.findOneAndUpdate({ _id: userId, platformRole: { $ne: "admin" } }, { $set: { disabled: true } });
  if (!u) return { ok: false, error: "Account not found." };
  await Session.deleteMany({ userId: u._id });
  const teams = (await Membership.find({ userId: u._id, role: "owner" }).select("workspaceId").lean()).map((m) => m.workspaceId);
  if (teams.length) {
    await Workspace.updateMany({ _id: { $in: teams } }, { $set: { status: "suspended", restrictedReason: "Suspended after account review." } });
    await ApiKey.updateMany({ workspaceId: { $in: teams }, revokedAt: null }, { $set: { revokedAt: new Date() } });
    await EmailLog.updateMany({ workspaceId: { $in: teams }, status: { $in: ["queued", "scheduled"] } }, { $set: { status: "canceled", errorMessage: "Canceled: account suspended." } });
  }
  revalidatePath("/admin/review");
  return { ok: true, message: `Suspended ${u.email}.` };
}
