"use client";

import { useActionState, useMemo, useState } from "react";
import { saveBlogPostAction, type OpsState } from "@/app/admin/ops-actions";
import { renderMarkdown, slugify } from "@/lib/markdown";

export type EditablePost = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  coverImage: string;
  coverAlt: string;
  authorName: string;
  authorRole: string;
  seoTitle: string;
  seoDescription: string;
  publishedAt: string; // yyyy-mm-dd
  status: "draft" | "published";
  featured: boolean;
};

const CATEGORIES = ["Guides", "Deliverability", "Tutorials", "Product"];

/** Markdown editor with live preview and a Google-result preview for SEO fields. */
export function BlogEditor({ post, saved }: { post: EditablePost; saved?: boolean }) {
  const [state, action, pending] = useActionState<OpsState, FormData>(saveBlogPostAction, saved ? { ok: true, message: "Saved." } : null);
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [slugTouched, setSlugTouched] = useState(!!post.id);
  const [content, setContent] = useState(post.content);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [seoTitle, setSeoTitle] = useState(post.seoTitle);
  const [seoDescription, setSeoDescription] = useState(post.seoDescription);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const preview = useMemo(() => (tab === "preview" ? renderMarkdown(content).html : ""), [tab, content]);
  const effSlug = slugTouched ? slug : slugify(title);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <form action={action} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      {post.id && <input type="hidden" name="id" value={post.id} />}
      <div className="space-y-4">
        <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Article title" className="input !h-auto !py-3 !text-[22px]" aria-label="Title" />
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <span className="mono text-xs">/blog/</span>
          <input name="slug" value={effSlug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} className="input !h-8 mono !text-xs" aria-label="URL slug" />
        </div>
        <textarea name="excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} maxLength={400} placeholder="Short summary shown on the blog index and in search results" className="input" aria-label="Excerpt" />

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="tabs !border-0">
              <button type="button" className="tab" data-active={tab === "write"} onClick={() => setTab("write")}>Write</button>
              <button type="button" className="tab" data-active={tab === "preview"} onClick={() => setTab("preview")}>Preview</button>
            </div>
            <span className="text-xs text-fg-subtle">Markdown · {words.toLocaleString()} words · ~{Math.max(1, Math.round(words / 220))} min read</span>
          </div>
          <textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} rows={28} className={`mono w-full resize-y bg-transparent p-4 text-[13.5px] leading-relaxed outline-none ${tab === "write" ? "" : "hidden"}`} placeholder={"## A heading\n\nWrite in Markdown. Use ## and ### headings — they build the table of contents."} aria-label="Content (Markdown)" />
          {tab === "preview" && (
            <div className="mkt max-h-[720px] overflow-y-auto rounded-b-2xl p-6">
              <div className="m-prose" dangerouslySetInnerHTML={{ __html: preview || "<p>Nothing to preview yet.</p>" }} />
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="card space-y-3 p-5">
          <div className="flex gap-2">
            <button name="intent" value="draft" className="btn btn-secondary flex-1" disabled={pending}>Save draft</button>
            <button name="intent" value="publish" className="btn btn-primary flex-1" disabled={pending}>{post.status === "published" ? "Update" : "Publish"}</button>
          </div>
          {state && <p className="text-sm" style={{ color: state.ok ? "var(--success)" : "var(--danger)" }} role="status">{state.ok ? state.message : state.error}</p>}
          <p className="text-xs text-fg-subtle">Status: <span className="capitalize">{post.status}</span>. A future publish date schedules the article.</p>
        </div>

        <div className="card space-y-3 p-5">
          <div><label className="label">Publish date</label><input type="date" name="publishedAt" defaultValue={post.publishedAt} className="input" /></div>
          <div><label className="label">Category</label>
            <select name="category" defaultValue={post.category} className="input">{[...new Set([...CATEGORIES, post.category])].map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div><label className="label">Tags (comma separated)</label><input name="tags" defaultValue={post.tags} className="input" placeholder="deliverability, dkim" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={post.featured} /> Feature on the blog index</label>
        </div>

        <div className="card space-y-3 p-5">
          <div><label className="label">Cover image URL (optional)</label><input name="coverImage" defaultValue={post.coverImage} className="input" placeholder="https://…" /></div>
          <div><label className="label">Cover alt text</label><input name="coverAlt" defaultValue={post.coverAlt} className="input" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Author</label><input name="authorName" defaultValue={post.authorName} className="input" /></div>
            <div><label className="label">Role</label><input name="authorRole" defaultValue={post.authorRole} className="input" /></div>
          </div>
        </div>

        <div className="card space-y-3 p-5">
          <p className="card-title">Search appearance</p>
          <div><label className="label">SEO title <span className="text-fg-subtle">({(seoTitle || title).length}/60)</span></label><input name="seoTitle" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="input" placeholder={title} /></div>
          <div><label className="label">Meta description <span className="text-fg-subtle">({(seoDescription || excerpt).length}/155)</span></label><textarea name="seoDescription" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={3} className="input" placeholder={excerpt} /></div>
          <div className="rounded-xl bg-white p-3 text-left" aria-label="Google preview">
            <p className="truncate text-[12px] text-[#202124]">stackemails.com › blog › {effSlug || "…"}</p>
            <p className="truncate text-[17px] leading-snug text-[#1a0dab]">{(seoTitle || title || "Article title").slice(0, 70)} · Stack Emails</p>
            <p className="line-clamp-2 text-[13px] text-[#4d5156]">{(seoDescription || excerpt || "Add an excerpt or meta description.").slice(0, 160)}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}
