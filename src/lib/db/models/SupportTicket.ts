import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

const TicketMessageSchema = new Schema(
  {
    author: { type: String, enum: ["customer", "staff"], required: true },
    name: { type: String, default: "" },
    body: { type: String, required: true },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

/** A customer support ticket opened from Help → New, answered from the admin panel. */
const SupportTicketSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["general", "billing", "deliverability", "domains", "api", "bug", "account"],
      default: "general",
    },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    status: { type: String, enum: ["open", "pending", "resolved", "closed"], default: "open", index: true },
    messages: { type: [TicketMessageSchema], default: [] },
    lastActivityAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: true },
);

export type SupportTicketDoc = InferSchemaType<typeof SupportTicketSchema> & BaseFields;
export const SupportTicket: Model<SupportTicketDoc> =
  (models.SupportTicket as Model<SupportTicketDoc>) || model<SupportTicketDoc>("SupportTicket", SupportTicketSchema);
