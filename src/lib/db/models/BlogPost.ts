import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import type { BaseFields } from "./_shared";

/** A public blog article (Markdown), managed from the admin panel. */
const BlogPostSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    excerpt: { type: String, default: "", trim: true },
    content: { type: String, default: "" }, // Markdown
    coverImage: { type: String, default: "" },
    coverAlt: { type: String, default: "" },
    tags: { type: [String], default: [], index: true },
    category: { type: String, default: "Guides", index: true },
    authorName: { type: String, default: "Stack Emails Team" },
    authorRole: { type: String, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date, index: true },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    readingMinutes: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true },
);
BlogPostSchema.index({ status: 1, publishedAt: -1 });

export type BlogPostDoc = InferSchemaType<typeof BlogPostSchema> & BaseFields;
export const BlogPost: Model<BlogPostDoc> =
  (models.BlogPost as Model<BlogPostDoc>) || model<BlogPostDoc>("BlogPost", BlogPostSchema);
