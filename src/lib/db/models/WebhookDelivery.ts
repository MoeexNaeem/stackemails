import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** One event delivery to a customer webhook, with its retry history. */
const WebhookDeliverySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    webhookId: { type: Schema.Types.ObjectId, ref: "Webhook", required: true, index: true },
    eventId: { type: String, required: true, index: true }, // evt_… (stable across retries)
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["pending", "retrying", "success", "failed"], default: "pending", index: true },
    attempts: { type: Number, default: 0 },
    nextRetryAt: { type: Date },
    responseStatus: { type: Number },
    responseBody: { type: String },
    error: { type: String },
    durationMs: { type: Number },
  },
  { timestamps: true },
);

// Keep 30 days of delivery history.
WebhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export type WebhookDeliveryDoc = InferSchemaType<typeof WebhookDeliverySchema> & BaseFields;

export const WebhookDelivery: Model<WebhookDeliveryDoc> =
  (models.WebhookDelivery as Model<WebhookDeliveryDoc>) ||
  model<WebhookDeliveryDoc>("WebhookDelivery", WebhookDeliverySchema);
