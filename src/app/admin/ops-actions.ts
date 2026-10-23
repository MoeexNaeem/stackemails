"use server";

import { createElement } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connect";
import { BlogPost, ContactMessage, Session, SupportTicket, User } from "@/lib/db/models";
import { sendSystemEmail } from "@/lib/email/system";
import { TicketEmail } from "@/emails/system";
import { readingMinutes, slugify } from "@/lib/markdown";
import { tagSlug } from "@/lib/blog";
import { env } from "@/lib/env";

export type OpsState = { ok: boolean; error?: string; message?: string } | null;

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user || user.platformRole !== "admin") throw new Error("Not authorized");
  await connectToDatabase();
  return user;
}

// ── Support tickets ───────────────────────────────────────
export async function staffReplyAction(_prev: OpsState, formData: FormData): Promise<OpsState> {
  const admin = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const status = String(formData.get("status") ?? "pending");
  if (!isValidObjectId(id)) return { ok: false, error: "Ticket not found." };
  if (body.length < 2 || body.length > 10_000) return { ok: false, error: "Write a reply first." };
  const t = await SupportTicket.findById(id);
  if (!t) return { ok: false, error: "Ticket not found." };

  t.messages.push({ author: "staff", name: "Stack Emails Support", body, at: new Date() });
  t.status = (["open", "pending", "resolved", "closed"].includes(status) ? status : "pending") as typeof t.status;
  t.lastActivityAt = new Date();
  await t.save();

  const customer = t.userId ? await User.findById(t.userId).select("name").lean() : null;
  const res = await sendSystemEmail({
    kind: "ticket_reply",
    to: t.email,
    subject: `Re: [#${t.number}] ${t.subject}`,
    react: createElement(TicketEmail, {
      heading: "We replied to your ticket",
      name: customer?.name || "there",
      number: t.number,
      subject: t.subject,
      body,
      footer: `Reply from Help in your dashboard: ${env.appUrl}/help`,
      staffReply: true,
    }),
  });
  console.info(`[admin] ${admin.email} replied to ticket #${t.number}`);
  revalidatePath(`/admin/support/${id}`);
  revalidatePath("/admin/support");
  return res.ok ? { ok: true, message: "Reply sent and emailed to the customer." } : { ok: true, message: `Reply saved, but the email failed: ${res.error}` };
}

export async function setTicketStatusAction(id: string, status: string): Promise<void> {
  await requireAdminUser();
  if (!isValidObjectId(id) || !["open", "pending", "resolved", "closed"].includes(status)) return;
  await SupportTicket.updateOne({ _id: id }, { $set: { status } });
  revalidatePath(`/admin/support/${id}`);
  revalidatePath("/admin/support");
}

// ── Contact-form messages ─────────────────────────────────
export async function setMessageStatusAction(id: string, status: string): Promise<void> {
  await requireAdminUser();
  if (!isValidObjectId(id) || !["new", "replied", "archived"].includes(status)) return;
  await ContactMessage.updateOne({ _id: id }, { $set: { status } });
  revalidatePath("/admin/messages");
}

// ── Users ─────────────────────────────────────────────────
export async function setUserDisabledAction(userId: string, disabled: boolean): Promise<void> {
  const admin = await requireAdminUser();
  if (!isValidObjectId(userId) || String(admin._id) === userId) return; // never lock yourself out
  await User.updateOne({ _id: userId }, { $set: { disabled } });
  if (disabled) await Session.deleteMany({ userId }); // sign them out everywhere
  revalidatePath("/admin/users", "layout");
}

// ── Blog CMS ──────────────────────────────────────────────
const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Title is required.").max(200),
  slug: z.string().trim().max(120).optional(),
  excerpt: z.string().trim().max(400).default(""),
  content: z.string().max(200_000).default(""),
  category: z.string().trim().max(60).default("Guides"),
  tags: z.string().max(400).default(""),
  coverImage: z.string().trim().max(1000).default(""),
  coverAlt: z.string().trim().max(300).default(""),
  authorName: z.string().trim().max(120).default("Stack Emails Team"),
  authorRole: z.string().trim().max(120).default(""),
  seoTitle: z.string().trim().max(200).default(""),
  seoDescription: z.string().trim().max(320).default(""),
  publishedAt: z.string().optional(),
  intent: z.enum(["draft", "publish"]).default("draft"),
  featured: z.string().optional(),
});

function revalidateBlog(slugs: string[], tags: string[]) {
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/llms.txt");
  for (const s of slugs) revalidatePath(`/blog/${s}`);
  for (const t of tags) revalidatePath(`/blog/tag/${tagSlug(t)}`);
  revalidatePath("/admin/blog");
}

export async function saveBlogPostAction(_prev: OpsState, formData: FormData): Promise<OpsState> {
  await requireAdminUser();
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const p = parsed.data;

  const slug = slugify(p.slug || p.title);
  if (!slug) return { ok: false, error: "Add a URL slug." };
  if (p.coverImage && !/^https:\/\//i.test(p.coverImage) && !p.coverImage.startsWith("/")) return { ok: false, error: "Cover image must be an https:// URL or a site path." };
  if (p.intent === "publish" && p.content.trim().length < 50) return { ok: false, error: "Write the article before publishing (50+ characters)." };

  const tags = [...new Set(p.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12);
  const existing = p.id && isValidObjectId(p.id) ? await BlogPost.findById(p.id) : null;
  if (p.id && !existing) return { ok: false, error: "Post not found." };
  const clash = await BlogPost.exists({ slug, ...(existing ? { _id: { $ne: existing._id } } : {}) });
  if (clash) return { ok: false, error: `Another post already uses /blog/${slug}.` };

  const publishedAt = p.publishedAt ? new Date(p.publishedAt) : existing?.publishedAt ?? new Date();
  if (Number.isNaN(publishedAt.getTime())) return { ok: false, error: "Invalid publish date." };

  const fields = {
    slug, title: p.title, excerpt: p.excerpt, content: p.content, category: p.category || "Guides", tags,
    coverImage: p.coverImage, coverAlt: p.coverAlt, authorName: p.authorName || "Stack Emails Team", authorRole: p.authorRole,
    seoTitle: p.seoTitle, seoDescription: p.seoDescription, readingMinutes: readingMinutes(p.content),
    featured: p.featured === "on",
    status: p.intent === "publish" ? "published" : "draft",
    publishedAt,
  } as const;

  const oldSlug = existing?.slug;
  const oldTags = existing?.tags ?? [];
  let id: string;
  if (existing) {
    existing.set(fields);
    await existing.save();
    id = String(existing._id);
  } else {
    id = String((await BlogPost.create(fields))._id);
  }
  if (fields.featured) await BlogPost.updateMany({ _id: { $ne: id }, featured: true }, { $set: { featured: false } });

  revalidateBlog([slug, ...(oldSlug && oldSlug !== slug ? [oldSlug] : [])], [...tags, ...oldTags]);
  if (!existing) redirect(`/admin/blog/${id}?saved=1`);
  return { ok: true, message: fields.status === "published" ? "Published — the article is live." : "Draft saved." };
}

export async function deleteBlogPostAction(id: string): Promise<void> {
  await requireAdminUser();
  if (!isValidObjectId(id)) return;
  const post = await BlogPost.findByIdAndDelete(id).lean();
  if (post) revalidateBlog([post.slug], post.tags ?? []);
  redirect("/admin/blog");
}
