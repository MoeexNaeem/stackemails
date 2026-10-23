import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** Audit trail of platform emails (welcome, resets, receipts, invites, tickets) for the admin panel. */
const SystemEmailLogSchema = new Schema(
  {
    kind: { type: String, required: true, index: true },
    to: { type: String, required: true, lowercase: true },
    subject: { type: String, default: "" },
    status: { type: String, enum: ["sent", "failed"], required: true, index: true },
    providerMessageId: { type: String },
    error: { type: String },
  },
  { timestamps: true },
);
// 90-day retention.
SystemEmailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export type SystemEmailLogDoc = InferSchemaType<typeof SystemEmailLogSchema> & BaseFields;
export const SystemEmailLog: Model<SystemEmailLogDoc> =
  (models.SystemEmailLog as Model<SystemEmailLogDoc>) ||
  model<SystemEmailLogDoc>("SystemEmailLog", SystemEmailLogSchema);
