import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** Audit record of one attempt to POST an event to a customer webhook URL. */
const WebhookDeliverySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    webhookId: { type: Schema.Types.ObjectId, ref: "Webhook", required: true, index: true },
    eventType: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ["success", "failed"], required: true },
    responseStatus: { type: Number },
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
