import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A pricing plan the SaaS owner offers to tenants. */
const PlanSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    priceMonthly: { type: Number, required: true, default: 0 }, // USD
    dailyQuota: { type: Number, default: 100 },
    monthlyQuota: { type: Number, default: 3000 },
    contactsQuota: { type: Number, default: 1000 },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type PlanDoc = InferSchemaType<typeof PlanSchema> & BaseFields;

export const Plan: Model<PlanDoc> =
  (models.Plan as Model<PlanDoc>) || model<PlanDoc>("Plan", PlanSchema);
