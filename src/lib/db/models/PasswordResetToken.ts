import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** Single-use password reset token. Only the SHA-256 hash is stored. */
const PasswordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    requestIp: { type: String },
  },
  { timestamps: true },
);

// TTL index: Mongo auto-deletes expired tokens.
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenDoc = InferSchemaType<typeof PasswordResetTokenSchema> & BaseFields;

export const PasswordResetToken: Model<PasswordResetTokenDoc> =
  (models.PasswordResetToken as Model<PasswordResetTokenDoc>) ||
  model<PasswordResetTokenDoc>("PasswordResetToken", PasswordResetTokenSchema);
