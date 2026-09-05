import "server-only";
import { connectToDatabase } from "@/lib/db/connect";
import { Membership, Workspace, type WorkspaceDoc, type UserDoc } from "@/lib/db/models";

/**
 * Return the workspace the given user is currently acting in. For now we use
 * their first membership (owner workspace). Multi-workspace switching can layer
 * on top of this later via a cookie-stored active workspace id.
 */
export async function getActiveWorkspace(user: UserDoc): Promise<WorkspaceDoc | null> {
  await connectToDatabase();
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
