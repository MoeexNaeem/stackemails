import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Monthly send allowance (PRD: monthly_quota).
    monthlyQuota: { type: Number, default: 3000 },

    // Rolling usage counters, reset by billing period.
    usage: {
      periodStart: { type: Date, default: () => new Date() },
      sent: { type: Number, default: 0 },
    },

    // Per-tenant secret used to sign outbound webhook payloads (HMAC-SHA256).
    webhookSecret: { type: String, required: true },
  },
  { timestamps: true },
);

export type WorkspaceDoc = InferSchemaType<typeof WorkspaceSchema> & BaseFields;

export const Workspace: Model<WorkspaceDoc> =
  (models.Workspace as Model<WorkspaceDoc>) ||
  model<WorkspaceDoc>("Workspace", WorkspaceSchema);
