import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A lifecycle event attached to an email (queued → sent → delivered/…). */
const EmailEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "queued",
        "sent",
        "delivered",
        "bounced",
        "complained",
        "opened",
        "clicked",
        "failed",
      ],
      required: true,
    },
    at: { type: Date, default: () => new Date() },
    detail: { type: String },
  },
  { _id: false },
);

const EmailLogSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    // Public id returned by the API, e.g. "msg_9f8e7d6c…".
    messageId: { type: String, required: true, unique: true, index: true },

    from: { type: String, required: true },
    to: { type: [String], required: true },
    cc: { type: [String], default: [] },
    bcc: { type: [String], default: [] },
    replyTo: { type: [String], default: [] },
    subject: { type: String, required: true },

    html: { type: String },
    text: { type: String },

    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "bounced", "complained", "failed"],
      default: "queued",
      index: true,
    },

    // Correlates SES/SNS async notifications back to this row.
    awsMessageId: { type: String, index: true },
    errorMessage: { type: String },

    // De-duplication for the optional Idempotency-Key header.
    idempotencyKey: { type: String, index: true },

    events: { type: [EmailEventSchema], default: [] },

    sentAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true },
);

// 30-day retention (PRD §3). Mongo purges old logs automatically.
EmailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
EmailLogSchema.index({ workspaceId: 1, idempotencyKey: 1 });

export type EmailLogDoc = InferSchemaType<typeof EmailLogSchema> & BaseFields;

export const EmailLog: Model<EmailLogDoc> =
  (models.EmailLog as Model<EmailLogDoc>) || model<EmailLogDoc>("EmailLog", EmailLogSchema);
