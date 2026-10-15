import { Workspace, type WorkspaceDoc } from "@/lib/db/models";
import { ApiErrors } from "@/lib/api/errors";

export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** How many a workspace has sent today (0 if the stored day isn't today). */
export function sentToday(workspace: WorkspaceDoc): number {
  return workspace.usage?.dayKey === dayKey() ? workspace.usage?.sentToday ?? 0 : 0;
}

/** Throw a 429 ApiError if the workspace is at its monthly or daily cap. */
export function assertWithinQuota(workspace: WorkspaceDoc): void {
  if ((workspace.usage?.sent ?? 0) >= workspace.monthlyQuota) {
    throw ApiErrors.quotaExceeded("Monthly send quota reached for this workspace.");
  }
  if (sentToday(workspace) >= workspace.dailyQuota) {
    throw ApiErrors.quotaExceeded("Daily send quota reached for this workspace.");
  }
}

/** Increment usage counters for one sent email, rolling the daily counter at
 *  the start of a new day. Approximate under concurrency, which is fine. */
export async function recordSend(workspaceId: string): Promise<void> {
  const key = dayKey();
  await Workspace.updateOne(
    { _id: workspaceId, "usage.dayKey": { $ne: key } },
    { $set: { "usage.dayKey": key, "usage.sentToday": 0 } },
  );
  await Workspace.updateOne(
    { _id: workspaceId },
    { $inc: { "usage.sent": 1, "usage.sentToday": 1 } },
  );
}
