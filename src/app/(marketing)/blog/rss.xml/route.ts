import { getPublishedPosts } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";
import { absUrl, site } from "@/lib/site";

export const revalidate = 600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

/** RSS 2.0 feed of published articles (full content). */
export async function GET() {
  const posts = (await getPublishedPosts()).slice(0, 50);
  const items = posts
    .map((p) => {
      const url = absUrl(`/blog/${p.slug}`);
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
      <dc:creator>${esc(p.authorName)}</dc:creator>
      <category>${esc(p.category)}</category>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join("\n")}
      <description>${esc(p.excerpt)}</description>
      <content:encoded>${cdata(renderMarkdown(p.content).html)}</content:encoded>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(site.name)} Blog</title>
    <link>${absUrl("/blog")}</link>
    <atom:link href="${absUrl("/blog/rss.xml")}" rel="self" type="application/rss+xml" />
    <description>${esc("Guides on email deliverability, authentication and building with the Stack Emails API.")}</description>
    <language>en-us</language>
    <image><url>${absUrl("/icon.svg")}</url><title>${esc(site.name)}</title><link>${site.url}</link></image>
    ${posts[0] ? `<lastBuildDate>${new Date(posts[0].updatedAt).toUTCString()}</lastBuildDate>` : ""}
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=600, s-maxage=600" } });
}
