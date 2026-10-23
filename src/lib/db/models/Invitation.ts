import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A pending invite to join a team. Only the token hash is stored. */
const InvitationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["admin", "member"], default: "member" },
    tokenHash: { type: String, required: true, unique: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
  },
  { timestamps: true },
);
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
InvitationSchema.index({ workspaceId: 1, email: 1 });

export type InvitationDoc = InferSchemaType<typeof InvitationSchema> & BaseFields;
export const Invitation: Model<InvitationDoc> =
  (models.Invitation as Model<InvitationDoc>) || model<InvitationDoc>("Invitation", InvitationSchema);
