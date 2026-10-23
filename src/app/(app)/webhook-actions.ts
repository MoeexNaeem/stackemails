"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isValidObjectId } from "mongoose";
import { requireDashboardContext } from "@/lib/auth/context";
import { connectToDatabase } from "@/lib/db/connect";
import { Webhook, WebhookDelivery, Workspace, WEBHOOK_EVENTS } from "@/lib/db/models";
import { assertPublicUrl } from "@/lib/net";
import { attemptDelivery, redeliver } from "@/lib/webhooks/dispatch";
import { prefixedId } from "@/lib/ids";

export type WebhookState = { ok: boolean; error?: string; message?: string };

async function ctx() {
  const c = await requireDashboardContext();
  await connectToDatabase();
  return c.workspace;
}

export async function createWebhookAction(_prev: WebhookState, formData: FormData): Promise<WebhookState> {
  const workspace = await ctx();
  const url = String(formData.get("url") ?? "").trim();
  const events = formData.getAll("events").map(String).filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(e));
  const safe = await assertPublicUrl(url);
  if (!safe.ok) return { ok: false, error: safe.reason };
  if ((await Webhook.countDocuments({ workspaceId: workspace._id })) >= 20) return { ok: false, error: "You can add up to 20 endpoints." };
  await Webhook.create({ workspaceId: workspace._id, url: safe.url.toString(), events, enabled: true });
  revalidatePath("/webhooks");
  return { ok: true, message: "Endpoint added." };
}

export async function toggleWebhookAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return;
  const w = await Webhook.findOne({ _id: id, workspaceId: workspace._id });
  if (!w) return;
  w.enabled = !w.enabled;
  await w.save();
  revalidatePath("/webhooks");
  revalidatePath(`/webhooks/${id}`);
}

export async function deleteWebhookAction(id: string): Promise<void> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return;
  await Webhook.deleteOne({ _id: id, workspaceId: workspace._id });
  revalidatePath("/webhooks");
}

/** Send a sample event to one endpoint immediately and report the result. */
export async function sendTestWebhookAction(id: string): Promise<WebhookState> {
  const workspace = await ctx();
  if (!isValidObjectId(id)) return { ok: false, error: "Endpoint not found." };
  const w = await Webhook.findOne({ _id: id, workspaceId: workspace._id });
  if (!w) return { ok: false, error: "Endpoint not found." };
  const eventId = prefixedId("evt");
  const d = await WebhookDelivery.create({
    workspaceId: workspace._id,
    webhookId: w._id,
    eventId,
    eventType: "email.sent",
    payload: { id: eventId, type: "email.sent", created_at: new Date().toISOString(), data: { email_id: "msg_test", to: ["test@example.com"], from: "Acme <hello@example.com>", subject: "Test event from Stack Emails", status: "sent", test: true } },
  });
  await attemptDelivery(String(d._id));
  const done = await WebhookDelivery.findById(d._id).lean();
  revalidatePath(`/webhooks/${id}`);
  return done?.status === "success"
    ? { ok: true, message: `Delivered — HTTP ${done.responseStatus} in ${done.durationMs}ms.` }
    : { ok: false, error: `Failed: ${done?.error ?? "unknown error"}${done?.status === "retrying" ? " (will retry)" : ""}` };
}

export async function redeliverAction(deliveryId: string): Promise<WebhookState> {
  const workspace = await ctx();
  if (!isValidObjectId(deliveryId)) return { ok: false, error: "Delivery not found." };
  const d = await WebhookDelivery.findOne({ _id: deliveryId, workspaceId: workspace._id }).select("webhookId");
  if (!d) return { ok: false, error: "Delivery not found." };
  await redeliver(deliveryId);
  revalidatePath(`/webhooks/${d.webhookId}`);
  return { ok: true, message: "Queued for redelivery." };
}

export async function rotateWebhookSecretAction(): Promise<WebhookState> {
  const workspace = await ctx();
  await Workspace.updateOne({ _id: workspace._id }, { $set: { webhookSecret: `whsec_${randomBytes(24).toString("hex")}` } });
  revalidatePath("/webhooks");
  return { ok: true, message: "Signing secret rotated. Update your verification code." };
}
