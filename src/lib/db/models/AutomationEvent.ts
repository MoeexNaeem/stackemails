import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A custom event definition (Automations → Events) that triggers automations via POST /v1/events. */
const AutomationEventSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true }, // e.g. "user.signed_up"
    description: { type: String, default: "" },
    received: { type: Number, default: 0 },
    lastReceivedAt: { type: Date },
  },
  { timestamps: true },
);
AutomationEventSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export type AutomationEventDoc = InferSchemaType<typeof AutomationEventSchema> & BaseFields;
export const AutomationEvent: Model<AutomationEventDoc> =
  (models.AutomationEvent as Model<AutomationEventDoc>) ||
  model<AutomationEventDoc>("AutomationEvent", AutomationEventSchema);
