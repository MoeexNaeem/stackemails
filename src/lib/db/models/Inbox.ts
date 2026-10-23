import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/**
 * A shared inbox: a dedicated address on a verified domain that can send and
 * receive. Inbound mail arrives via the domain's MX record or via the inbox's
 * built-in receiving alias.
 */
const InboxSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, lowercase: true, trim: true }, // local@verified-domain
    domainId: { type: Schema.Types.ObjectId, ref: "Domain" },
    receiveMode: { type: String, enum: ["domain", "alias"], default: "alias" },
    // Receiving alias when receiveMode = alias: <local>@<inboundKey>.<inbound domain>
    alias: { type: String, lowercase: true, trim: true, index: true },
    unread: { type: Number, default: 0 },
  },
  { timestamps: true },
);
InboxSchema.index({ workspaceId: 1, address: 1 }, { unique: true });

export type InboxDoc = InferSchemaType<typeof InboxSchema> & BaseFields;
export const Inbox: Model<InboxDoc> = (models.Inbox as Model<InboxDoc>) || model<InboxDoc>("Inbox", InboxSchema);
