import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/**
 * A customer's bank-transfer payment, waiting for the admin to confirm the money
 * arrived. Used while no card processor is connected. The proof file (screenshot
 * or PDF) is stored here and only ever served to the platform admin.
 */
const ManualPaymentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    workspaceName: { type: String, default: "" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    email: { type: String, required: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    planName: { type: String, required: true },
    amount: { type: Number, required: true }, // USD expected
    reference: { type: String, required: true }, // code the customer puts in the transfer memo, e.g. SE-1042
    number: { type: Number, required: true, unique: true },
    payerName: { type: String, default: "" },
    payerNote: { type: String, default: "" }, // bank transaction ID or anything the customer adds
    proof: {
      data: { type: Buffer, select: false },
      contentType: { type: String },
      size: { type: Number },
      filename: { type: String },
    },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectReason: { type: String, default: "" },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
  },
  { timestamps: true },
);

ManualPaymentSchema.index({ status: 1, createdAt: -1 });

export type ManualPaymentDoc = InferSchemaType<typeof ManualPaymentSchema> & BaseFields;

export const ManualPayment: Model<ManualPaymentDoc> =
  (models.ManualPayment as Model<ManualPaymentDoc>) || model<ManualPaymentDoc>("ManualPayment", ManualPaymentSchema);
