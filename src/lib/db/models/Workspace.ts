import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Monthly send allowance (PRD: monthly_quota).
    monthlyQuota: { type: Number, default: 3000 },

    // Daily send allowance (plan-enforced, alongside the monthly cap).
    dailyQuota: { type: Number, default: 100 },

    // Rolling usage counters, reset by billing period.
    usage: {
      periodStart: { type: Date, default: () => new Date() },
      sent: { type: Number, default: 0 },
      // Daily counter + the day it applies to (YYYY-MM-DD).
      dayKey: { type: String, default: "" },
      sentToday: { type: Number, default: 0 },
    },

    // Admin controls. active = normal; restricted = can't send; suspended = locked out.
    status: { type: String, enum: ["active", "restricted", "suspended"], default: "active", index: true },
    restrictedReason: { type: String, default: "" },

    // Per-tenant secret used to sign outbound webhook payloads (HMAC-SHA256).
    webhookSecret: { type: String, required: true },

    // Billing / plan (all free tier by default).
    plan: { type: String, enum: ["free", "pro", "scale"], default: "free" },
    contactsQuota: { type: Number, default: 1000 },
    billingEmail: { type: String, default: "" },
    billing: {
      fullName: { type: String, default: "" },
      country: { type: String, default: "United States" },
      addressLine1: { type: String, default: "" },
      taxIdType: { type: String, default: "European VAT number" },
      taxId: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export type WorkspaceDoc = InferSchemaType<typeof WorkspaceSchema> & BaseFields;

export const Workspace: Model<WorkspaceDoc> =
  (models.Workspace as Model<WorkspaceDoc>) ||
  model<WorkspaceDoc>("Workspace", WorkspaceSchema);
