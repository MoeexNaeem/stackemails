import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/**
 * API keys authenticate REST requests. Format: `ns_live_<32 hex bytes>`.
 * The raw key is shown to the user exactly once; we persist only a
 * salted SHA-256 hash plus a short display suffix.
 */
const ApiKeySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    mode: { type: String, enum: ["live", "test"], default: "live" },

    // SHA-256(secret + rawKey), indexed for O(1) lookup on auth.
    keyHash: { type: String, required: true, unique: true, index: true },
    // Last 4 chars of the raw key, for display ("ns_live_…a1b2").
    last4: { type: String, required: true },
    // Leading chars shown in the table ("ns_live_5f3c…").
    keyPrefix: { type: String, default: "" },

    // Access level and optional domain restriction.
    permission: { type: String, enum: ["full_access", "sending_access"], default: "full_access" },
    domainScope: { type: String, default: "all" }, // "all" or a Domain _id

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastUsedAt: { type: Date },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

export type ApiKeyDoc = InferSchemaType<typeof ApiKeySchema> & BaseFields;

export const ApiKey: Model<ApiKeyDoc> =
  (models.ApiKey as Model<ApiKeyDoc>) || model<ApiKeyDoc>("ApiKey", ApiKeySchema);
