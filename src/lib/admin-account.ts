import { randomBytes } from "node:crypto";
import { connectToDatabase } from "@/lib/db/connect";
import { Session, User } from "@/lib/db/models";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAccount } from "@/lib/accounts";

const LEGACY_ADMIN = "admin@stackemails.com";

/**
 * Ensure the platform admin from ADMIN_EMAIL / ADMIN_PASSWORD exists, has the
 * admin role and the configured password. Also demotes the legacy seeded
 * admin (whose password is public) so it can't be used to reach /admin.
 *
 * Zero-infra local dev (no MONGODB_URI, no ADMIN_* vars) keeps the demo admin.
 */
export async function syncPlatformAdmin(): Promise<{ email: string; created: boolean; demotedLegacy: boolean } | null> {
  await connectToDatabase();
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!email || !password) {
    if (process.env.MONGODB_URI) return null; // never invent credentials on a real database
    if (!(await User.findOne({ email: LEGACY_ADMIN }))) {
      await createAccount({ name: "Platform Admin", email: LEGACY_ADMIN, password: "admin123", workspaceName: "Admin HQ" });
    }
    await User.updateOne({ email: LEGACY_ADMIN }, { $set: { platformRole: "admin" } });
    return { email: LEGACY_ADMIN, created: false, demotedLegacy: false };
  }
  if (password.length < 10) throw new Error("ADMIN_PASSWORD must be at least 10 characters.");

  let created = false;
  let user = await User.findOne({ email });
  if (!user) {
    await createAccount({ name: "Stack Emails Admin", email, password, workspaceName: "Stack Emails HQ" });
    user = await User.findOne({ email });
    created = true;
  } else if (!(await verifyPassword(password, user.passwordHash))) {
    user.passwordHash = await hashPassword(password);
    await Session.deleteMany({ userId: user._id }); // password changed → sign out everywhere
  }
  user!.platformRole = "admin";
  await user!.save();

  let demotedLegacy = false;
  if (email !== LEGACY_ADMIN) {
    const legacy = await User.findOne({ email: LEGACY_ADMIN, platformRole: "admin" });
    if (legacy) {
      legacy.platformRole = "user";
      legacy.passwordHash = await hashPassword(randomBytes(24).toString("hex"));
      await legacy.save();
      await Session.deleteMany({ userId: legacy._id });
      demotedLegacy = true;
    }
  }
  return { email, created, demotedLegacy };
}
