import { cache } from "react";
import { connectToDatabase } from "@/lib/db/connect";
import { BlogPost } from "@/lib/db/models";
import { SEED_POSTS } from "@/content/blog-posts";
import { readingMinutes, slugify } from "@/lib/markdown";

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverAlt: string;
  tags: string[];
  category: string;
  authorName: string;
  authorRole: string;
  featured: boolean;
  publishedAt: Date;
  updatedAt: Date;
  seoTitle: string;
  seoDescription: string;
  readingMinutes: number;
};

function fromSeed(): Post[] {
  return SEED_POSTS.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: "",
    coverAlt: "",
    tags: p.tags,
    category: p.category,
    authorName: "Stack Emails Team",
    authorRole: "",
    featured: !!p.featured,
    publishedAt: new Date(p.publishedAt),
    updatedAt: new Date(p.publishedAt),
    seoTitle: p.seoTitle ?? "",
    seoDescription: p.seoDescription ?? "",
    readingMinutes: readingMinutes(p.content),
  })).sort((a, b) => +b.publishedAt - +a.publishedAt);
}

/**
 * All published posts, newest first. Falls back to the bundled launch
 * articles only when the database cannot be reached (e.g. offline builds).
 */
export const getPublishedPosts = cache(async (): Promise<Post[]> => {
  try {
    await connectToDatabase();
    const docs = await BlogPost.find({ status: "published", publishedAt: { $lte: new Date() } }).sort({ publishedAt: -1 }).lean();
    return docs.map((d) => ({
      slug: d.slug,
      title: d.title,
      excerpt: d.excerpt ?? "",
      content: d.content ?? "",
      coverImage: d.coverImage ?? "",
      coverAlt: d.coverAlt ?? "",
      tags: d.tags ?? [],
      category: d.category ?? "Guides",
      authorName: d.authorName ?? "Stack Emails Team",
      authorRole: d.authorRole ?? "",
      featured: !!d.featured,
      publishedAt: d.publishedAt ?? d.createdAt,
      updatedAt: d.updatedAt ?? d.publishedAt ?? d.createdAt,
      seoTitle: d.seoTitle ?? "",
      seoDescription: d.seoDescription ?? "",
      readingMinutes: d.readingMinutes || readingMinutes(d.content ?? ""),
    }));
  } catch (err) {
    console.warn("[blog] database unavailable, using bundled posts:", (err as Error).message);
    return fromSeed();
  }
});

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getPublishedPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}

export function tagSlug(tag: string) {
  return slugify(tag);
}

export async function getTags(): Promise<{ tag: string; slug: string; count: number }[]> {
  const counts = new Map<string, { tag: string; count: number }>();
  for (const p of await getPublishedPosts()) {
    for (const t of p.tags) {
      const s = tagSlug(t);
      if (!s) continue;
      const cur = counts.get(s) ?? { tag: t, count: 0 };
      cur.count++;
      counts.set(s, cur);
    }
  }
  return [...counts.entries()].map(([slug, v]) => ({ slug, ...v })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Posts sharing the most tags with `post` (then newest). */
export function relatedPosts(post: Post, all: Post[], n = 3): Post[] {
  const tags = new Set(post.tags);
  return all
    .filter((p) => p.slug !== post.slug)
    .map((p) => ({ p, score: p.tags.filter((t) => tags.has(t)).length + (p.category === post.category ? 0.5 : 0) }))
    .sort((a, b) => b.score - a.score || +b.p.publishedAt - +a.p.publishedAt)
    .slice(0, n)
    .map((x) => x.p);
}

export function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
