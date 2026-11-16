import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    // Accounts created with Google get a random, unknown password; they can set one via "Forgot password".
    passwordHash: { type: String, required: true },
    // Google account id ("sub" claim), set once the account signs in with Google.
    googleId: { type: String, unique: true, sparse: true },
    avatarUrl: { type: String },
    // Set when the person clicks the verification link (or signs up with Google).
    emailVerifiedAt: { type: Date },
    // Set when a platform admin approves the account to send (or the owner pays for a plan).
    // New accounts can't add sending domains until then.
    sendingApprovedAt: { type: Date },
    // Last domain the account tried to add while waiting for review (shown in Admin > Review).
    reviewRequestedAt: { type: Date },
    reviewDomain: { type: String },
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
