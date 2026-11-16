"use server";

import { cookies } from "next/headers";
import { isValidObjectId } from "mongoose";
import { getCurrentUser } from "@/lib/auth/session";
import { ACTIVE_WS_COOKIE } from "@/lib/auth/workspace";
import { connectToDatabase } from "@/lib/db/connect";
import { Membership } from "@/lib/db/models";
import { createWorkspaceFor } from "@/lib/accounts";
import { containsLink } from "@/lib/abuse-rules";
import { FREE_MAX_OWNED_TEAMS, ownerHasPaidPlan } from "@/lib/abuse";

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
  if (containsLink(name)) return { ok: false, error: "Team names can't contain links or domain names." };

  await connectToDatabase();
  const owned = await Membership.countDocuments({ userId: user._id, role: "owner" });
  // Free accounts get a small team allowance; spreading sending across many free teams was an abuse vector.
  const maxTeams = (await ownerHasPaidPlan(user._id)) ? 10 : FREE_MAX_OWNED_TEAMS;
  if (owned >= maxTeams) {
    return { ok: false, error: maxTeams === 10 ? "You can own up to 10 teams." : `Free accounts can own up to ${FREE_MAX_OWNED_TEAMS} teams. Upgrade a team to create more.` };
  }

  const ws = await createWorkspaceFor(user._id, name);
  (await cookies()).set(ACTIVE_WS_COOKIE, String(ws._id), COOKIE_OPTS);
  return { ok: true };
}
