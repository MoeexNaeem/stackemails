import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A single DNS record the customer must add to authenticate their domain. */
const DnsRecordSchema = new Schema(
  {
    type: { type: String, enum: ["TXT", "CNAME", "MX"], required: true },
    name: { type: String, required: true }, // host / record name
    value: { type: String, required: true }, // record value
    purpose: { type: String, enum: ["SPF", "DKIM", "DMARC", "MX", "verification"], required: true },
    status: { type: String, enum: ["pending", "verified", "failed"], default: "pending" },
  },
  { _id: false },
);

const DomainSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, lowercase: true, trim: true },
    region: { type: String, default: "us-east-1" },

    // pending → verified / failed (mirrors SES identity verification).
    status: { type: String, enum: ["pending", "verified", "failed"], default: "pending" },

    records: { type: [DnsRecordSchema], default: [] },

    // Sending / receiving + tracking configuration (Resend-style).
    returnPath: { type: String, default: "send" },
    trackingSubdomain: { type: String, default: "" },
    clickTracking: { type: Boolean, default: true },
    openTracking: { type: Boolean, default: false },
    receivingEnabled: { type: Boolean, default: false },
    tlsMode: { type: String, enum: ["opportunistic", "enforced"], default: "opportunistic" },
    provider: { type: String, default: "" }, // registrar, best-effort

    // Verification timeline shown on the domain detail page.
    events: {
      type: [
        new Schema(
          {
            type: { type: String, enum: ["added", "dns_verified", "verified", "failed"], required: true },
            at: { type: Date, default: () => new Date() },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    // SES linkage (null in mock mode).
    awsIdentityArn: { type: String },
    dkimTokens: { type: [String], default: [] },

    verifiedAt: { type: Date },
    lastCheckedAt: { type: Date },
  },
  { timestamps: true },
);

DomainSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export type DomainDoc = InferSchemaType<typeof DomainSchema> & BaseFields;

export const Domain: Model<DomainDoc> =
  (models.Domain as Model<DomainDoc>) || model<DomainDoc>("Domain", DomainSchema);
