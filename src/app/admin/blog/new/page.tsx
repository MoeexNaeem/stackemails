import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { BlogEditor } from "@/components/admin/BlogEditor";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "New article" };

export default async function NewPostPage() {
  await requireAdmin();
  return (
    <div className="space-y-5">
      <Link href="/admin/blog" className="text-sm text-fg-muted hover:text-fg"><Icon name="arrow-left" size={14} className="mr-1" />Blog</Link>
      <h1 className="text-[28px] font-normal tracking-[-0.02em]">New article</h1>
      <BlogEditor
        post={{ title: "", slug: "", excerpt: "", content: "", category: "Guides", tags: "", coverImage: "", coverAlt: "", authorName: "Stack Emails Team", authorRole: "", seoTitle: "", seoDescription: "", publishedAt: new Date().toISOString().slice(0, 10), status: "draft", featured: false }}
      />
    </div>
  );
}
