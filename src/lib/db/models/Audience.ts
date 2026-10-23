import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/**
 * A segment: a named group of contacts targeted by broadcasts and
 * automations. (Stored in the historical "audiences" collection.)
 */
const AudienceSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

export type AudienceDoc = InferSchemaType<typeof AudienceSchema> & BaseFields;

export const Audience: Model<AudienceDoc> =
  (models.Audience as Model<AudienceDoc>) || model<AudienceDoc>("Audience", AudienceSchema);

/** Preferred name in new code. */
export const Segment = Audience;
export type SegmentDoc = AudienceDoc;
