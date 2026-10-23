import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/**
 * A person in a team's audience. Contacts are team-wide (one row per email);
 * they belong to any number of segments, carry custom properties, and hold
 * per-topic subscription choices.
 */
const ContactSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    // Global marketing opt-out (unsubscribe from everything).
    unsubscribed: { type: Boolean, default: false, index: true },
    unsubscribedAt: { type: Date },
    segmentIds: { type: [Schema.Types.ObjectId], ref: "Audience", default: [], index: true },
    // Custom property values keyed by ContactProperty.key.
    properties: { type: Schema.Types.Mixed, default: {} },
    // Explicit topic choices; topics not listed fall back to the topic default.
    topics: {
      type: [new Schema({ topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true }, subscribed: { type: Boolean, required: true } }, { _id: false })],
      default: [],
    },
    source: { type: String, enum: ["api", "dashboard", "import", "inbound"], default: "dashboard" },
    // Legacy single-audience link (pre-segments). Migrated into segmentIds.
    audienceId: { type: Schema.Types.ObjectId, ref: "Audience" },
  },
  { timestamps: true, minimize: false },
);

ContactSchema.index({ workspaceId: 1, email: 1 }, { unique: true });
ContactSchema.index({ workspaceId: 1, createdAt: -1 });

export type ContactDoc = InferSchemaType<typeof ContactSchema> & BaseFields;

export const Contact: Model<ContactDoc> =
  (models.Contact as Model<ContactDoc>) || model<ContactDoc>("Contact", ContactSchema);
