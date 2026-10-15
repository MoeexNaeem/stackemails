import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** One inbound REST API request, surfaced on the Logs page. */
const ApiLogSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    endpoint: { type: String, required: true }, // e.g. "/emails"
    method: { type: String, required: true }, // GET/POST/...
    status: { type: Number, required: true }, // HTTP status
    source: { type: String, default: "api" }, // api | sdk | smtp | dashboard
    userAgent: { type: String },
    ip: { type: String },
    durationMs: { type: Number },
  },
  { timestamps: true },
);

// 30-day retention.
ApiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

export type ApiLogDoc = InferSchemaType<typeof ApiLogSchema> & BaseFields;

export const ApiLog: Model<ApiLogDoc> =
  (models.ApiLog as Model<ApiLogDoc>) || model<ApiLogDoc>("ApiLog", ApiLogSchema);
