import "server-only";
import type { Types } from "mongoose";
import * as M from "@/lib/db/models";
import { deleteDomain } from "@/lib/domains";

/**
 * Permanently remove a workspace and everything that belongs to it.
 * Internal only - callers must have already authorised the deletion.
 */
export async function purgeWorkspace(workspaceId: Types.ObjectId) {
  const domains = await M.Domain.find({ workspaceId }).select("_id").lean();
  for (const d of domains) await deleteDomain(workspaceId, String(d._id)).catch(() => {});
  const byWs = [M.ApiKey, M.EmailLog, M.InboundEmail, M.Inbox, M.Contact, M.ContactProperty, M.Topic, M.Audience, M.Broadcast, M.Automation, M.AutomationEvent, M.Suppression, M.Template, M.Webhook, M.WebhookDelivery, M.ApiLog, M.Membership, M.Invitation, M.Subscription, M.DailyStat];
  await Promise.all(byWs.map((Model) => (Model as unknown as { deleteMany(f: object): Promise<unknown> }).deleteMany({ workspaceId })));
  await M.Workspace.deleteOne({ _id: workspaceId });
}
