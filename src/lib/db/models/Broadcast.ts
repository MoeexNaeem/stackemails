import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A marketing broadcast: a designed email sent to an audience. */
const BroadcastSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, default: "Untitled", trim: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent"],
      default: "draft",
      index: true,
    },
    audienceId: { type: Schema.Types.ObjectId, ref: "Audience" }, // target segment
    topicId: { type: Schema.Types.ObjectId, ref: "Topic" }, // only contacts subscribed to this topic

    from: { type: String, default: "" },
    replyTo: { type: String, default: "" },
    subject: { type: String, default: "" },
    previewText: { type: String, default: "" },
    html: { type: String, default: "" },
    // Visual-builder block layout (JSON string of blocks).
    design: { type: String, default: "" },

    scheduledAt: { type: Date },
    sentAt: { type: Date },
    stats: {
      recipients: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export type BroadcastDoc = InferSchemaType<typeof BroadcastSchema> & BaseFields;

export const Broadcast: Model<BroadcastDoc> =
  (models.Broadcast as Model<BroadcastDoc>) || model<BroadcastDoc>("Broadcast", BroadcastSchema);
