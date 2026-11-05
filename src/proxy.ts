import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/connect";
import { BlogPost } from "@/lib/db/models";
import { slugify as tagSlug } from "@/lib/markdown";

/**
 * Real 404s for unknown blog posts and tag pages.
 *
 * Blog pages render inside a loading boundary, so a notFound() thrown while
 * rendering arrives after a 200 has already started streaming (a "soft 404").
 * Checking the slug here, before rendering, lets us return a genuine 404 that
 * search engines drop from the index. Known slugs are cached for 5 minutes;
 * only unknown slugs hit the database, so newly published posts work at once.
 * If the database is unreachable we let the request through unchanged.
 */

const TTL = 5 * 60_000;
let cache: { at: number; slugs: Set<string>; tags: Set<string> } | null = null;


async function load() {
  await connectToDatabase();
  const posts = await BlogPost.find({ status: "published", publishedAt: { $lte: new Date() } }).select("slug tags").lean();
  cache = { at: Date.now(), slugs: new Set(posts.map((p) => p.slug)), tags: new Set(posts.flatMap((p) => (p.tags ?? []).map(tagSlug))) };
  return cache;
}

/** Hits come from the cache; a miss reloads the list (at most once per 15s) so new posts work at once. */
async function exists(kind: "slugs" | "tags", value: string): Promise<boolean> {
  if (cache && Date.now() - cache.at < TTL && cache[kind].has(value)) return true;
  if (cache && Date.now() - cache.at < 15_000) return cache[kind].has(value);
  return (await load())[kind].has(value);
}

export async function proxy(req: NextRequest) {
  const [, , first, second] = req.nextUrl.pathname.split("/");
  const isTag = first === "tag";
  const value = decodeURIComponent((isTag ? second : first) ?? "").toLowerCase();
  if (!value || (!isTag && (value === "rss.xml" || value === "sitemap.xml"))) return NextResponse.next();
  try {
    if (await exists(isTag ? "tags" : "slugs", value)) return NextResponse.next();
  } catch (err) {
    console.error("[proxy] blog slug check failed", (err as Error).message);
    return NextResponse.next();
  }
  // No route matches this path, so Next renders app/not-found.tsx with a 404 status.
  return NextResponse.rewrite(new URL("/__not-found", req.url));
}

export const config = {
  matcher: ["/blog/:slug", "/blog/tag/:tag"],
};
