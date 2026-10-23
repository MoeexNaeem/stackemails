import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A subscription topic (e.g. "Product updates") shown on the preference page. */
const TopicSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    // true = contacts receive this topic unless they opt out (opt-out model).
    defaultSubscribed: { type: Boolean, default: true },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
  },
  { timestamps: true },
);

export type TopicDoc = InferSchemaType<typeof TopicSchema> & BaseFields;

export const Topic: Model<TopicDoc> =
  (models.Topic as Model<TopicDoc>) || model<TopicDoc>("Topic", TopicSchema);
