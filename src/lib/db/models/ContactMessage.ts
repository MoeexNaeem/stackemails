import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A message from the public website contact / sales form. */
const ContactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    company: { type: String, default: "", trim: true },
    topic: { type: String, enum: ["sales", "support", "partnership", "press", "other"], default: "sales" },
    volume: { type: String, default: "" },
    message: { type: String, required: true },
    status: { type: String, enum: ["new", "replied", "archived"], default: "new", index: true },
    ip: { type: String },
  },
  { timestamps: true },
);

export type ContactMessageDoc = InferSchemaType<typeof ContactMessageSchema> & BaseFields;
export const ContactMessage: Model<ContactMessageDoc> =
  (models.ContactMessage as Model<ContactMessageDoc>) || model<ContactMessageDoc>("ContactMessage", ContactMessageSchema);
