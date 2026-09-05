import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** Links a user to a workspace with a role (enables agencies / teams). */
const MembershipSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
  },
  { timestamps: true },
);

MembershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export type MembershipDoc = InferSchemaType<typeof MembershipSchema> & BaseFields;

export const Membership: Model<MembershipDoc> =
  (models.Membership as Model<MembershipDoc>) ||
  model<MembershipDoc>("Membership", MembershipSchema);
