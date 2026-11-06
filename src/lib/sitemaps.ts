import "server-only";
import { getPublishedPosts, getTags } from "@/lib/blog";
import { FEATURES } from "@/content/features";
import { COMPARISONS } from "@/content/compare";
import { DOCS } from "@/content/docs";
import { SMTP_PROVIDERS } from "@/content/pseo/smtp";
import { GUIDES } from "@/content/pseo/guides";
import { TEMPLATES } from "@/content/pseo/templates";
import { TOOLS } from "@/content/pseo/tools";
import { ALTERNATIVES } from "@/content/pseo/alternatives";
import { GLOSSARY } from "@/content/pseo/glossary";
import { absUrl } from "@/lib/site";

/**
 * Sitemap index + per-section child sitemaps (Yoast-style):
 *   /sitemap.xml            index of every child below
 *   /blog/sitemap.xml       index of the blog children only
 *   /sitemaps/<name>.xml    one sitemap per section
 * lastmod uses real dates (post updatedAt, content review dates), never "now".
 * No XSL stylesheet: Chrome is removing XSLT support, and crawlers never used it.
 */

type Entry = { loc: string; lastmod?: Date; images?: string[] };

/** Bump when the static marketing/programmatic content is meaningfully revised. */
const CONTENT_UPDATED = new Date("2026-11-05T00:00:00Z");
const LAUNCH = new Date("2026-10-23T00:00:00Z");

const at = (path: string, lastmod: Date = CONTENT_UPDATED): Entry => ({ loc: absUrl(path), lastmod });

export const SITEMAPS: Record<string, { blog?: boolean; build: () => Promise<Entry[]> }> = {
  pages: {
    build: async () => [
      at("/"),
      at("/pricing"),
      at("/features", LAUNCH),
      ...FEATURES.map((f) => at(`/features/${f.slug}`, LAUNCH)),
      at("/compare", LAUNCH),
      ...COMPARISONS.map((c) => at(`/compare/${c.slug}`, LAUNCH)),
      at("/docs", LAUNCH),
      ...DOCS.map((d) => at(`/docs/${d.slug}`, LAUNCH)),
      at("/changelog"),
      at("/about", LAUNCH),
      at("/contact", LAUNCH),
      at("/security", LAUNCH),
      at("/status"),
      at("/privacy", LAUNCH),
      at("/terms"),
      at("/refund"),
      at("/acceptable-use"),
      at("/legal/dpa", LAUNCH),
      at("/legal/subprocessors", LAUNCH),
      at("/signup", LAUNCH),
    ],
  },
  "blog-posts": {
    blog: true,
    build: async () => {
      const posts = await getPublishedPosts();
      return [
        { loc: absUrl("/blog"), lastmod: posts[0]?.updatedAt ?? CONTENT_UPDATED },
        ...posts.map((p) => ({ loc: absUrl(`/blog/${p.slug}`), lastmod: p.updatedAt, images: p.coverImage ? [p.coverImage.startsWith("http") ? p.coverImage : absUrl(p.coverImage)] : [] })),
      ];
    },
  },
  "blog-categories": {
    blog: true,
    build: async () => {
      const [posts, tags] = await Promise.all([getPublishedPosts(), getTags()]);
      const latestFor = (slug: string) => posts.find((p) => p.tags.some((t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-") === slug))?.updatedAt;
      return tags.map((t) => ({ loc: absUrl(`/blog/tag/${t.slug}`), lastmod: latestFor(t.slug) ?? posts[0]?.updatedAt ?? CONTENT_UPDATED }));
    },
  },
  "smtp-settings": { build: async () => [at("/smtp-settings"), ...SMTP_PROVIDERS.map((p) => at(`/smtp-settings/${p.slug}`))] },
  "send-email": { build: async () => [at("/send-email"), ...GUIDES.map((g) => at(`/send-email/${g.slug}`))] },
  "email-templates": { build: async () => [at("/email-templates"), ...TEMPLATES.map((t) => at(`/email-templates/${t.slug}`))] },
  tools: { build: async () => [at("/tools"), ...TOOLS.map((t) => at(`/tools/${t.slug}`))] },
  alternatives: { build: async () => [at("/alternatives"), ...ALTERNATIVES.map((a) => at(`/alternatives/${a.slug}`))] },
  glossary: { build: async () => [at("/glossary"), ...GLOSSARY.map((t) => at(`/glossary/${t.slug}`))] },
};

const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const iso = (d?: Date) => (d && !Number.isNaN(+d) ? d.toISOString() : undefined);
const HEAD = `<?xml version="1.0" encoding="UTF-8"?>\n`;

export function urlsetXml(entries: Entry[]): string {
  const hasImages = entries.some((e) => e.images?.length);
  const body = entries
    .map((e) => {
      const lm = iso(e.lastmod);
      const imgs = (e.images ?? []).map((i) => `<image:image><image:loc>${xmlEsc(i)}</image:loc></image:image>`).join("");
      return `<url><loc>${xmlEsc(e.loc)}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ""}${imgs}</url>`;
    })
    .join("\n");
  return `${HEAD}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${hasImages ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"' : ""}>\n${body}\n</urlset>\n`;
}

export async function indexXml(onlyBlog = false): Promise<string> {
  const names = Object.entries(SITEMAPS).filter(([, s]) => !onlyBlog || s.blog);
  const items = await Promise.all(
    names.map(async ([name, s]) => {
      const entries = await s.build();
      const latest = entries.reduce<Date | undefined>((m, e) => (e.lastmod && (!m || e.lastmod > m) ? e.lastmod : m), undefined);
      return `<sitemap><loc>${absUrl(`/sitemaps/${name}.xml`)}</loc>${latest ? `<lastmod>${iso(latest)}</lastmod>` : ""}</sitemap>`;
    }),
  );
  return `${HEAD}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>\n`;
}

export const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400", "X-Robots-Tag": "noindex, follow" };
