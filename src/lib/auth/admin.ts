import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import type { UserDoc } from "@/lib/db/models";

/**
 * Guard for the platform admin panel. Redirects non-admins away, and requires
 * two-factor authentication: a stolen admin password alone must never be enough
 * to control the platform.
 */
export async function requireAdmin(): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "admin") redirect("/login");
  if (!user.mfaEnabled) redirect("/profile?mfa=required");
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.platformRole === "admin";
}
