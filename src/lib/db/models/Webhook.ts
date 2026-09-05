import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

export const WEBHOOK_EVENTS = [
  "email.sent",
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.opened",
  "email.clicked",
  "email.failed",
  "domain.verified",
] as const;

const WebhookSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    url: { type: String, required: true, trim: true },
    // Subset of WEBHOOK_EVENTS this endpoint subscribes to. Empty = all.
    events: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type WebhookDoc = InferSchemaType<typeof WebhookSchema> & BaseFields;

export const Webhook: Model<WebhookDoc> =
  (models.Webhook as Model<WebhookDoc>) || model<WebhookDoc>("Webhook", WebhookSchema);
