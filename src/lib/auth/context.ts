import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveWorkspace } from "@/lib/auth/workspace";
import type { UserDoc, WorkspaceDoc } from "@/lib/db/models";

/** For dashboard server components: resolve the user + active workspace or redirect. */
export async function requireDashboardContext(): Promise<{
  user: UserDoc;
  workspace: WorkspaceDoc;
}> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const workspace = await getActiveWorkspace(user);
  if (!workspace) redirect("/login");
  return { user, workspace };
}
