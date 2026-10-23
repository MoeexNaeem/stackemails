"use server";

import { cookies } from "next/headers";
import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import { ACTIVE_WS_COOKIE } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { Membership } from "@/lib/db/models";
import { createWorkspaceFor } from "@/lib/accounts";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
};

/** Switch the active team. Only teams the user belongs to are accepted. */
export async function switchTeamAction(workspaceId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || !isValidObjectId(workspaceId)) return { ok: false };
  await connectToDatabase();
  const member = await Membership.exists({ userId: user._id, workspaceId });
  if (!member) return { ok: false };
  (await cookies()).set(ACTIVE_WS_COOKIE, workspaceId, COOKIE_OPTS);
  return { ok: true };
}

/** Create a new team owned by the current user and switch to it. */
export async function createTeamAction(rawName: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const name = String(rawName ?? "").trim();
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Team name must be 2–80 characters." };

  await connectToDatabase();
  const owned = await Membership.countDocuments({ userId: user._id, role: "owner" });
  if (owned >= 10) return { ok: false, error: "You can own up to 10 teams." };

  const ws = await createWorkspaceFor(user._id, name);
  (await cookies()).set(ACTIVE_WS_COOKIE, String(ws._id), COOKIE_OPTS);
  return { ok: true };
}
