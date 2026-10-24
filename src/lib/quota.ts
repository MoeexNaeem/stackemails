import { Workspace, type WorkspaceDoc } from "@/lib/db/models";
import { ApiErrors } from "@/lib/api/errors";

export function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** How many a workspace has sent today (0 if the stored day isn't today). */
export function sentToday(workspace: WorkspaceDoc): number {
  return workspace.usage?.dayKey === dayKey() ? workspace.usage?.sentToday ?? 0 : 0;
}

/** One calendar month after `d` (clamped, so Jan 31 → Feb 28/29). */
export function addMonth(d: Date): Date {
  const r = new Date(d);
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + 1);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
}

/** Start of the current monthly usage period (anniversary of periodStart). */
export function currentPeriodStart(workspace: Pick<WorkspaceDoc, "usage" | "createdAt">, now = new Date()): Date {
  let start = new Date(workspace.usage?.periodStart ?? workspace.createdAt ?? now);
  if (start > now) return now;
  for (let next = addMonth(start); next <= now; next = addMonth(start)) start = next;
  return start;
}

/** Emails sent in the current monthly period (0 once the stored period has rolled over). */
export function sentThisPeriod(workspace: Pick<WorkspaceDoc, "usage" | "createdAt">, now = new Date()): number {
  const stored = new Date(workspace.usage?.periodStart ?? workspace.createdAt ?? now);
  return addMonth(stored) <= now ? 0 : workspace.usage?.sent ?? 0;
}

/** Throw a 429 ApiError if the workspace is at its monthly or daily cap. */
export function assertWithinQuota(workspace: WorkspaceDoc): void {
  if (sentThisPeriod(workspace) >= workspace.monthlyQuota) {
    throw ApiErrors.quotaExceeded("Monthly send quota reached for this workspace.");
  }
  if (sentToday(workspace) >= workspace.dailyQuota) {
    throw ApiErrors.quotaExceeded("Daily send quota reached for this workspace.");
  }
}

/** Increment usage counters for a sent email - one unit per recipient (to +
 *  cc + bcc) - rolling the daily counter at the start of a new day and the
 *  monthly counter on the period anniversary. Approximate under concurrency,
 *  which is fine. */
export async function recordSend(workspaceId: string, recipients = 1): Promise<void> {
  const n = Math.max(1, Math.floor(recipients));
  const key = dayKey();
  const ws = await Workspace.findById(workspaceId).select("usage createdAt").lean();
  if (ws) {
    const stored = new Date(ws.usage?.periodStart ?? ws.createdAt ?? new Date());
    if (addMonth(stored) <= new Date()) {
      // Conditional on the stored value so concurrent senders roll it once.
      await Workspace.updateOne(
        { _id: workspaceId, "usage.periodStart": ws.usage?.periodStart ?? null },
        { $set: { "usage.periodStart": currentPeriodStart(ws as WorkspaceDoc), "usage.sent": 0 } },
      );
    }
  }
  await Workspace.updateOne(
    { _id: workspaceId, "usage.dayKey": { $ne: key } },
    { $set: { "usage.dayKey": key, "usage.sentToday": 0 } },
  );
  await Workspace.updateOne(
    { _id: workspaceId },
    { $inc: { "usage.sent": n, "usage.sentToday": n } },
  );
}
