import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A named list of contacts for marketing/broadcast sends. */
const AudienceSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export type AudienceDoc = InferSchemaType<typeof AudienceSchema> & BaseFields;

export const Audience: Model<AudienceDoc> =
  (models.Audience as Model<AudienceDoc>) || model<AudienceDoc>("Audience", AudienceSchema);
