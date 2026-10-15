import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A reusable email template, editable and referenced when sending. */
const TemplateSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, default: "Untitled template", trim: true },
    subject: { type: String, default: "" },
    html: { type: String, default: "" },
    category: { type: String, default: "custom" },
  },
  { timestamps: true },
);

export type TemplateDoc = InferSchemaType<typeof TemplateSchema> & BaseFields;

export const Template: Model<TemplateDoc> =
  (models.Template as Model<TemplateDoc>) || model<TemplateDoc>("Template", TemplateSchema);
