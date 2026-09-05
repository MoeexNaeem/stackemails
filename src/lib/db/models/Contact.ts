import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

const ContactSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    audienceId: { type: Schema.Types.ObjectId, ref: "Audience", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    unsubscribed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One email per audience.
ContactSchema.index({ audienceId: 1, email: 1 }, { unique: true });

export type ContactDoc = InferSchemaType<typeof ContactSchema> & BaseFields;

export const Contact: Model<ContactDoc> =
  (models.Contact as Model<ContactDoc>) || model<ContactDoc>("Contact", ContactSchema);
