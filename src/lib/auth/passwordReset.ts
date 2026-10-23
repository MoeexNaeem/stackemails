import "server-only";
import { createElement } from "react";
import { randomBytes } from "node:crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { PasswordResetToken, Session, User } from "@/lib/db/models";
import { hashPassword } from "@/lib/auth/password";
import { sha256 } from "@/lib/crypto";
import { sendSystemEmail } from "@/lib/email/system";
import { PasswordChangedEmail, PasswordResetEmail } from "@/emails/system";
import { env } from "@/lib/env";

export const RESET_TOKEN_TTL_MINUTES = 30;

/**
 * Issue a single-use reset token and email the link. Silently does nothing
 * for unknown emails so the endpoint can't be used to enumerate accounts.
 */
export async function requestPasswordReset(email: string, requestIp?: string): Promise<void> {
  await connectToDatabase();
  const user = await User.findOne({ email });
  if (!user) return;

  // Only the newest link should work.
  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: { $exists: false } });

  const raw = randomBytes(32).toString("hex");
  await PasswordResetToken.create({
    userId: user._id,
    tokenHash: sha256(raw),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000),
    requestIp,
  });

  const resetUrl = `${env.appUrl}/reset-password?token=${raw}`;
  await sendSystemEmail({
    kind: "password_reset",
    to: user.email,
    subject: "Reset your Stack Emails password",
    react: createElement(PasswordResetEmail, {
      name: user.name,
      resetUrl,
      minutes: RESET_TOKEN_TTL_MINUTES,
    }),
  });
}

export type ResetResult = { ok: true; userId: string } | { ok: false; message: string };

/**
 * Consume a reset token: set the new password, burn the token, sign out every
 * existing session, and notify the user that their password changed.
 */
export async function resetPassword(rawToken: string, newPassword: string): Promise<ResetResult> {
  await connectToDatabase();

  // Atomically claim the token so it can't be used twice in a race.
  const token = await PasswordResetToken.findOneAndUpdate(
    { tokenHash: sha256(rawToken), usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  );
  if (!token) {
    return { ok: false, message: "This reset link is invalid or has expired. Request a new one." };
  }

  const user = await User.findById(token.userId);
  if (!user) return { ok: false, message: "This reset link is invalid or has expired." };

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await Session.deleteMany({ userId: user._id });

  await sendSystemEmail({
    kind: "password_changed",
    to: user.email,
    subject: "Your Stack Emails password was changed",
    react: createElement(PasswordChangedEmail, { name: user.name }),
  });

  return { ok: true, userId: String(user._id) };
}
