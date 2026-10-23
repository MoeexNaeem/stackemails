import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/**
 * Per-team, per-day, per-sender-domain counters. Updated incrementally as
 * events happen, so dashboards stay fast at any volume and history outlives
 * the 30-day EmailLog retention.
 */
const DailyStatSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    day: { type: String, required: true }, // YYYY-MM-DD (UTC)
    domain: { type: String, default: "" }, // sender domain
    total: { type: Number, default: 0 }, // created / queued
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 },
    bouncePermanent: { type: Number, default: 0 },
    bounceTransient: { type: Number, default: 0 },
    complained: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    received: { type: Number, default: 0 },
  },
  { timestamps: false },
);
DailyStatSchema.index({ workspaceId: 1, day: 1, domain: 1 }, { unique: true });
DailyStatSchema.index({ day: 1 });

export type DailyStatDoc = InferSchemaType<typeof DailyStatSchema> & BaseFields;
export const DailyStat: Model<DailyStatDoc> =
  (models.DailyStat as Model<DailyStatDoc>) || model<DailyStatDoc>("DailyStat", DailyStatSchema);

export type StatField = "total" | "sent" | "delivered" | "bounced" | "bouncePermanent" | "bounceTransient" | "complained" | "opened" | "clicked" | "failed" | "received";
