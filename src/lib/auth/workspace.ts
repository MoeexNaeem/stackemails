import "server-only";
import { cookies } from "next/headers";
import { isValidObjectId, type Types } from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { Membership, Workspace, type WorkspaceDoc, type UserDoc } from "@/lib/db/models";

export const ACTIVE_WS_COOKIE = "stackemails_ws";

/**
 * The workspace ("team") the user is acting in: the one named by the
 * active-team cookie when the user is a member of it, else their oldest
 * membership. Membership is always re-checked, so a forged cookie can't
 * reach another tenant's data.
 */
export async function getActiveWorkspace(user: UserDoc): Promise<WorkspaceDoc | null> {
  await connectToDatabase();
  const store = await cookies();
  const wanted = store.get(ACTIVE_WS_COOKIE)?.value;

  if (wanted && isValidObjectId(wanted)) {
    const m = await Membership.findOne({ userId: user._id, workspaceId: wanted });
    if (m) {
      const ws = await Workspace.findById(m.workspaceId);
      if (ws) return ws;
    }
  }
  const membership = await Membership.findOne({ userId: user._id }).sort({ createdAt: 1 });
  if (!membership) return null;
  return Workspace.findById(membership.workspaceId);
}

export async function listWorkspacesForUser(user: UserDoc): Promise<WorkspaceDoc[]> {
  await connectToDatabase();
  const memberships = await Membership.find({ userId: user._id });
  const ids = memberships.map((m) => m.workspaceId);
  return Workspace.find({ _id: { $in: ids } }).sort({ createdAt: 1 });
}

/** The caller's role in a workspace, or null if not a member. */
export async function roleIn(userId: Types.ObjectId | string, workspaceId: Types.ObjectId | string): Promise<"owner" | "admin" | "member" | null> {
  const m = await Membership.findOne({ userId, workspaceId }).select("role").lean();
  return (m?.role as "owner" | "admin" | "member" | undefined) ?? null;
}
