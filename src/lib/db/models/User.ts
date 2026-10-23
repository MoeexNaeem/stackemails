import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    // Platform-level role. "admin" = the SaaS owner's superadmin panel access.
    platformRole: { type: String, enum: ["user", "admin"], default: "user", index: true },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    // Two-factor auth (TOTP). The secret is AES-GCM encrypted at rest.
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String, select: false },
    mfaPendingSecret: { type: String, select: false },
    mfaLastCounter: { type: Number, default: -1, select: false },
    mfaRecoveryHashes: { type: [String], default: [], select: false },
    // Admin moderation
    disabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & BaseFields;

export const User: Model<UserDoc> =
  (models.User as Model<UserDoc>) || model<UserDoc>("User", UserSchema);
