import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { BlogPost } from "@/lib/db/models";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { deleteBlogPostAction } from "@/app/admin/ops-actions";
import { Icon } from "@/components/ui/Icon";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit article" };

export default async function EditPostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  if (!isValidObjectId(id)) notFound();
  await connectToDatabase();
  const p = await BlogPost.findById(id).lean();
  if (!p) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/blog" className="text-sm text-fg-muted hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Blog</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-normal tracking-[-0.02em]">Edit article</h1>
        <div className="flex gap-2">
          {p.status === "published" && <Link href={`/blog/${p.slug}`} target="_blank" className="btn btn-secondary btn-sm">View live <Icon name="arrow-up-right" size={14} /></Link>}
          <form action={deleteBlogPostAction.bind(null, String(p._id))}>
            <button className="btn btn-danger btn-sm">Delete</button>
          </form>
        </div>
      </div>
      <BlogEditor
        saved={saved === "1"}
        post={{
          id: String(p._id), title: p.title, slug: p.slug, excerpt: p.excerpt ?? "", content: p.content ?? "", category: p.category ?? "Guides",
          tags: (p.tags ?? []).join(", "), coverImage: p.coverImage ?? "", coverAlt: p.coverAlt ?? "", authorName: p.authorName ?? "Stack Emails Team",
          authorRole: p.authorRole ?? "", seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "",
          publishedAt: (p.publishedAt ?? new Date()).toISOString().slice(0, 10), status: p.status as "draft" | "published", featured: !!p.featured,
        }}
      />
    </div>
  );
}
