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
        "suppressed", // some recipients skipped because they're on the suppression list
        "scheduled",
        "canceled",
        "delivery_delayed",
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
      enum: ["queued", "scheduled", "sent", "delivered", "delivery_delayed", "bounced", "complained", "failed", "canceled"],
      default: "queued",
      index: true,
    },

    // Correlates SES/SNS async notifications back to this row.
    awsMessageId: { type: String, index: true },
    errorMessage: { type: String },

    // De-duplication for the optional Idempotency-Key header.
    idempotencyKey: { type: String, index: true },

    events: { type: [EmailEventSchema], default: [] },

    // Extra MIME headers (List-Unsubscribe, custom X- headers).
    headers: {
      type: [new Schema({ name: { type: String, required: true }, value: { type: String, required: true } }, { _id: false })],
      default: [],
    },
    // Attachments are sent once and not retained; only metadata is kept for the UI.
    attachments: {
      type: [new Schema({ filename: String, contentType: String, size: Number }, { _id: false })],
      default: [],
    },
    // Raw attachment bytes, held only until the worker sends the email, then unset.
    attachmentBlobs: {
      type: [new Schema({ filename: String, contentType: String, data: Buffer }, { _id: false })],
      select: false,
      default: undefined,
    },
    // Tags supplied by the caller (also forwarded to SES for analytics).
    tags: {
      type: [new Schema({ name: String, value: String }, { _id: false })],
      default: [],
    },

    // Where the send came from, for filtering (API key / dashboard / broadcast / automation / smtp).
    source: { type: String, enum: ["api", "dashboard", "broadcast", "automation", "smtp", "inbox"], default: "api", index: true },
    apiKeyId: { type: Schema.Types.ObjectId, ref: "ApiKey", index: true },
    broadcastId: { type: Schema.Types.ObjectId, ref: "Broadcast", index: true },
    contactId: { type: Schema.Types.ObjectId, ref: "Contact" },

    // Engagement (open pixel / click redirect tracking).
    opens: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    // Bounce classification from SES (Permanent / Transient / Undetermined).
    bounceType: { type: String },

    scheduledAt: { type: Date },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true },
);
EmailLogSchema.index({ workspaceId: 1, createdAt: -1 });

// 30-day retention (PRD §3). Mongo purges old logs automatically.
EmailLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
EmailLogSchema.index({ workspaceId: 1, idempotencyKey: 1 });

export type EmailLogDoc = InferSchemaType<typeof EmailLogSchema> & BaseFields;

export const EmailLog: Model<EmailLogDoc> =
  (models.EmailLog as Model<EmailLogDoc>) || model<EmailLogDoc>("EmailLog", EmailLogSchema);
