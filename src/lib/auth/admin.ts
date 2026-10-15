import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import type { UserDoc } from "@/lib/db/models";

/** Guard for the platform admin panel. Redirects non-admins away. */
export async function requireAdmin(): Promise<UserDoc> {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "admin") redirect("/login");
  return user;
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.platformRole === "admin";
}
