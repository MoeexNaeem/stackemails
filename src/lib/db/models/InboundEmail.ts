import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** An email received by a team (Emails → Receiving) or an inbox thread message. */
const InboundEmailSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    inboxId: { type: Schema.Types.ObjectId, ref: "Inbox", index: true },
    messageId: { type: String, required: true, unique: true }, // public id "inb_..."
    rfcMessageId: { type: String, index: true }, // Message-ID header (threading)
    inReplyTo: { type: String },
    threadId: { type: String, index: true },
    from: { type: String, required: true },
    fromName: { type: String, default: "" },
    to: { type: [String], default: [] },
    cc: { type: [String], default: [] },
    subject: { type: String, default: "(no subject)" },
    text: { type: String },
    html: { type: String },
    snippet: { type: String, default: "" },
    attachments: {
      type: [new Schema({ filename: String, contentType: String, size: Number }, { _id: false })],
      default: [],
    },
    spamVerdict: { type: String, default: "" },
    virusVerdict: { type: String, default: "" },
    read: { type: Boolean, default: false },
    direction: { type: String, enum: ["inbound", "outbound"], default: "inbound" },
  },
  { timestamps: true },
);
InboundEmailSchema.index({ workspaceId: 1, createdAt: -1 });

export type InboundEmailDoc = InferSchemaType<typeof InboundEmailSchema> & BaseFields;
export const InboundEmail: Model<InboundEmailDoc> =
  (models.InboundEmail as Model<InboundEmailDoc>) || model<InboundEmailDoc>("InboundEmail", InboundEmailSchema);
