import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/**
 * A suppressed recipient — Stack Emails won't send to these addresses. Populated
 * from hard bounces and complaints, or added manually.
 */
const SuppressionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    reason: { type: String, enum: ["bounce", "complaint", "manual", "unsubscribe"], default: "manual" },
  },
  { timestamps: true },
);

SuppressionSchema.index({ workspaceId: 1, email: 1 }, { unique: true });

export type SuppressionDoc = InferSchemaType<typeof SuppressionSchema> & BaseFields;

export const Suppression: Model<SuppressionDoc> =
  (models.Suppression as Model<SuppressionDoc>) ||
  model<SuppressionDoc>("Suppression", SuppressionSchema);
