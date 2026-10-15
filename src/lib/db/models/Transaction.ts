import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A billing event (revenue line) — what the admin "earnings" views are built on. */
const TransactionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    workspaceName: { type: String, default: "" },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    planName: { type: String, default: "" },
    amount: { type: Number, required: true }, // USD, negative for refunds
    type: { type: String, enum: ["new", "renewal", "upgrade", "refund"], default: "new" },
    status: { type: String, enum: ["paid", "failed", "refunded"], default: "paid", index: true },
    periodStart: { type: Date },
    periodEnd: { type: Date },
  },
  { timestamps: true },
);

TransactionSchema.index({ createdAt: -1 });

export type TransactionDoc = InferSchemaType<typeof TransactionSchema> & BaseFields;

export const Transaction: Model<TransactionDoc> =
  (models.Transaction as Model<TransactionDoc>) ||
  model<TransactionDoc>("Transaction", TransactionSchema);
