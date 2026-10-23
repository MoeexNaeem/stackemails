import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { connectToDatabase } from "@/lib/db/connect";
import { BlogPost } from "@/lib/db/models";
import { FilterBar } from "@/components/ui/FilterBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { escapeRegex } from "@/lib/filters";
import { timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blog" };

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  await requireAdmin();
  await connectToDatabase();
  const sp = await searchParams;
  const filter: Record<string, unknown> = {};
  if (sp.status === "draft" || sp.status === "published") filter.status = sp.status;
  if (sp.q?.trim()) filter.title = { $regex: escapeRegex(sp.q.trim()), $options: "i" };
  const posts = await BlogPost.find(filter).sort({ publishedAt: -1, createdAt: -1 }).select("slug title status category featured publishedAt updatedAt views readingMinutes").lean();
  const now = Date.now();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-normal tracking-[-0.02em]">Blog</h1>
          <p className="mt-1 text-sm text-fg-muted">Articles at <Link href="/blog" target="_blank" className="underline">/blog</Link>. Publishing updates the sitemap, RSS feed and llms.txt automatically.</p>
        </div>
        <Link href="/admin/blog/new" className="btn btn-primary">New article</Link>
      </div>
      <FilterBar fields={[{ type: "search", name: "q", placeholder: "Search titles…" }, { type: "select", name: "status", options: [{ value: "", label: "All" }, { value: "published", label: "Published" }, { value: "draft", label: "Drafts" }] }]} />
      {posts.length === 0 ? (
        <div className="card"><EmptyState title="No articles" description="Write your first article — it's server-rendered and indexed automatically."><Link href="/admin/blog/new" className="btn btn-primary btn-sm">New article</Link></EmptyState></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[760px]">
            <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Published</th><th className="text-right">Updated</th></tr></thead>
            <tbody>
              {posts.map((p) => {
                const scheduled = p.status === "published" && p.publishedAt && +new Date(p.publishedAt) > now;
                return (
                  <tr key={String(p._id)}>
                    <td>
                      <Link href={`/admin/blog/${p._id}`} className="font-medium hover:text-[var(--violet)]">{p.title}</Link>
                      {p.featured && <span className="badge ml-2" style={{ color: "var(--lime)" }}>featured</span>}
                      <span className="block mono text-xs text-fg-subtle">/blog/{p.slug} · {p.readingMinutes} min</span>
                    </td>
                    <td className="text-fg-muted">{p.category}</td>
                    <td><span className="badge capitalize" style={{ color: p.status === "published" ? (scheduled ? "#f59e0b" : "var(--success)") : "var(--fg-muted)" }}>{scheduled ? "scheduled" : p.status}</span></td>
                    <td className="text-fg-muted">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}</td>
                    <td className="text-right text-fg-subtle">{timeAgo(p.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
