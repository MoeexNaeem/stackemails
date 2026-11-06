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
    // Never hold a page hostage to a slow database: after 2s, let the request through.
    const check = exists(isTag ? "tags" : "slugs", value);
    check.catch(() => {}); // a late failure after the timeout must not become an unhandled rejection
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<"timeout">((resolve) => { timer = setTimeout(() => resolve("timeout"), 2000); });
    const found = await Promise.race([check, timeout]).finally(() => clearTimeout(timer));
    if (found === "timeout") {
      console.error("[proxy] blog slug check timed out after 2s");
      return NextResponse.next();
    }
    if (found) return NextResponse.next();
  } catch (err) {
    console.error("[proxy] blog slug check failed", (err as Error).message);
    return NextResponse.next();
  }
  // Answer directly instead of rewriting: behind nginx the rewrite URL's host (localhost)
  // differs from the one Next listens on (127.0.0.1), so Next treated it as an external
  // proxy and failed with a 500. A self-contained 404 page can't hit that.
  return new NextResponse(NOT_FOUND_HTML, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=0, s-maxage=300" },
  });
}

const NOT_FOUND_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Article not found · Stack Emails</title>
<link rel="icon" href="/icon.svg">
<style>
:root{--bg:#fafaf9;--card:#fff;--line:#e7e5e4;--head:#0c0a09;--text:#57534e;--accent:#4f46e5}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0c;--card:#141416;--line:#27272a;--head:#fafafa;--text:#a1a1aa;--accent:#a5b4fc}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--text);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:520px;width:100%;text-align:center;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:48px 28px}
.logo{display:inline-flex;align-items:center;gap:10px;color:var(--head);font-weight:600;text-decoration:none;margin-bottom:28px}
.logo span{display:grid;place-items:center;width:32px;height:32px;border-radius:9px;background:#0c0a09;color:#d9f99d;font-size:13px;font-weight:700}
.code{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);font-weight:600}
h1{margin:10px 0 12px;color:var(--head);font-size:30px;line-height:1.15;letter-spacing:-.02em}
.links{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:28px}
.links a{padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:500;font-size:15px;border:1px solid var(--line);color:var(--head)}
.links a.primary{background:var(--head);color:var(--bg);border-color:var(--head)}
</style>
</head>
<body>
<main>
<a class="logo" href="/"><span>SE</span>Stack Emails</a>
<p class="code">404</p>
<h1>We couldn't find that article</h1>
<p>It may have been moved or renamed. Browse the latest posts or search our guides and free tools.</p>
<div class="links"><a class="primary" href="/blog">Read the blog</a><a href="/send-email">Send email guides</a><a href="/tools">Free tools</a></div>
</main>
</body>
</html>`;

export const config = {
  matcher: ["/blog/:slug", "/blog/tag/:tag"],
};
