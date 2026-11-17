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
    // Period end the "ends soon" reminder was sent for (so it goes out once per period).
    reminderSentFor: { type: Date },
    canceledAt: { type: Date },
    // "manual" = bank transfer / admin; "paddle" = Paddle charges and renews it automatically.
    provider: { type: String, enum: ["manual", "paddle"], default: "manual" },
    paddleSubscriptionId: { type: String, index: true, sparse: true },
    paddleCustomerId: { type: String },
    // Set when the customer cancelled in Paddle; the plan stays until this date.
    cancelAt: { type: Date },
  },
  { timestamps: true },
);

export type SubscriptionDoc = InferSchemaType<typeof SubscriptionSchema> & BaseFields;

export const Subscription: Model<SubscriptionDoc> =
  (models.Subscription as Model<SubscriptionDoc>) ||
  model<SubscriptionDoc>("Subscription", SubscriptionSchema);
