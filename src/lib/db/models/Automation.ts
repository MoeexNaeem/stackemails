import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A single step in an automation (wait or send-email). */
const AutomationStepSchema = new Schema(
  {
    type: { type: String, enum: ["wait", "email"], required: true },
    // For wait steps:
    waitDuration: { type: Number }, // amount
    waitUnit: { type: String, enum: ["minutes", "hours", "days"] },
    // For email steps:
    subject: { type: String },
    html: { type: String },
    from: { type: String },
  },
  { _id: true },
);

/**
 * An automation: a trigger + an ordered list of steps. e.g. "when a contact is
 * added → wait 1 day → send welcome email".
 */
const AutomationSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, default: "Untitled automation", trim: true },
    status: { type: String, enum: ["draft", "active", "paused"], default: "draft", index: true },
    trigger: {
      type: String,
      enum: ["contact.added", "contact.updated"],
      default: "contact.added",
    },
    audienceId: { type: Schema.Types.ObjectId, ref: "Audience" },
    steps: { type: [AutomationStepSchema], default: [] },
    stats: {
      entered: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

export type AutomationDoc = InferSchemaType<typeof AutomationSchema> & BaseFields;

export const Automation: Model<AutomationDoc> =
  (models.Automation as Model<AutomationDoc>) || model<AutomationDoc>("Automation", AutomationSchema);
