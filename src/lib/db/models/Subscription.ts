import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A tenant's current subscription to a plan. One per workspace. */
const SubscriptionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, unique: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    planName: { type: String, default: "Free" },
    priceMonthly: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled", "expired"],
      default: "active",
      index: true,
    },
    autoRenew: { type: Boolean, default: true },
    currentPeriodStart: { type: Date, default: () => new Date() },
    currentPeriodEnd: { type: Date },
    lastRenewedAt: { type: Date },
    canceledAt: { type: Date },
  },
  { timestamps: true },
);

export type SubscriptionDoc = InferSchemaType<typeof SubscriptionSchema> & BaseFields;

export const Subscription: Model<SubscriptionDoc> =
  (models.Subscription as Model<SubscriptionDoc>) ||
  model<SubscriptionDoc>("Subscription", SubscriptionSchema);
