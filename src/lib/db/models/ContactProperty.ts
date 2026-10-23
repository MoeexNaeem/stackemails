import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A custom contact field (e.g. "plan", "city") usable as {{contact.key}} in broadcasts. */
const ContactPropertySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    key: { type: String, required: true, trim: true }, // snake_case identifier
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: ["string", "number", "boolean", "date"], default: "string" },
    fallback: { type: String, default: "" }, // used when a contact has no value
  },
  { timestamps: true },
);
ContactPropertySchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export type ContactPropertyDoc = InferSchemaType<typeof ContactPropertySchema> & BaseFields;

export const ContactProperty: Model<ContactPropertyDoc> =
  (models.ContactProperty as Model<ContactPropertyDoc>) ||
  model<ContactPropertyDoc>("ContactProperty", ContactPropertySchema);
