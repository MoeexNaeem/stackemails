import type { Metadata } from "next";
import { site } from "@/lib/site";

const DEFAULT_OG = [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${site.name} — ${site.tagline}` }];

/**
 * Complete per-page metadata: title, description, canonical, and matching
 * Open Graph / Twitter tags. Next merges `openGraph` shallowly, so a page
 * that doesn't set its own would inherit the homepage's og:title and og:url —
 * always build page metadata through this helper.
 *
 * `title` is the page title (the root template appends "· Stack Emails");
 * pass `absoluteTitle` to skip the template.
 */
export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  type?: "website" | "article";
  /** Omit to use the site card; pass [] when a segment's opengraph-image file supplies it. */
  images?: { url: string; width?: number; height?: number; alt?: string }[];
  article?: { publishedTime?: string; modifiedTime?: string; authors?: string[]; section?: string; tags?: string[] };
  keywords?: string[];
  noindex?: boolean;
}): Metadata {
  const fullTitle = opts.absoluteTitle ? opts.title : `${opts.title} · ${site.name}`;
  const images = opts.images ?? DEFAULT_OG;
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    ...(opts.keywords ? { keywords: opts.keywords } : {}),
    alternates: { canonical: opts.path },
    openGraph: {
      type: opts.type ?? "website",
      siteName: site.name,
      locale: site.locale,
      url: opts.path,
      title: fullTitle,
      description: opts.description,
      ...(images.length ? { images } : {}),
      ...(opts.type === "article" && opts.article ? opts.article : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: site.twitter,
      title: fullTitle,
      description: opts.description,
      ...(images.length ? { images: images.map((i) => i.url) } : {}),
    },
    ...(opts.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
