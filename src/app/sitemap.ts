import type { MetadataRoute } from "next";
import { getPublishedPosts, getTags } from "@/lib/blog";
import { FEATURES } from "@/content/features";
import { COMPARISONS } from "@/content/compare";
import { DOCS } from "@/content/docs";
import { absUrl } from "@/lib/site";

export const revalidate = 3600;

/** One sitemap for every public, indexable URL (blog entries carry real lastmod dates). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getTags()]);
  const now = new Date();
  const latestPost = posts[0]?.updatedAt ?? now;

  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"], lastModified: Date = now) => ({ url: absUrl(path), lastModified, changeFrequency, priority });

  return [
    page("/", 1, "weekly"),
    page("/pricing", 0.9, "monthly"),
    page("/features", 0.9, "monthly"),
    ...FEATURES.map((f) => page(`/features/${f.slug}`, 0.8, "monthly")),
    page("/docs", 0.9, "weekly"),
    ...DOCS.map((d) => page(`/docs/${d.slug}`, 0.7, "monthly")),
    page("/blog", 0.8, "daily", latestPost),
    ...posts.map((p) => ({ url: absUrl(`/blog/${p.slug}`), lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.7, ...(p.coverImage ? { images: [p.coverImage] } : {}) })),
    ...tags.map((t) => page(`/blog/tag/${t.slug}`, 0.4, "weekly", latestPost)),
    page("/compare", 0.6, "monthly"),
    ...COMPARISONS.map((c) => page(`/compare/${c.slug}`, 0.7, "monthly")),
    page("/changelog", 0.5, "weekly"),
    page("/about", 0.5, "yearly"),
    page("/contact", 0.5, "yearly"),
    page("/security", 0.5, "yearly"),
    page("/status", 0.3, "daily"),
    page("/privacy", 0.3, "yearly"),
    page("/terms", 0.3, "yearly"),
    page("/legal/dpa", 0.3, "yearly"),
    page("/legal/subprocessors", 0.3, "yearly"),
    page("/signup", 0.6, "yearly"),
    page("/login", 0.3, "yearly"),
  ];
}
