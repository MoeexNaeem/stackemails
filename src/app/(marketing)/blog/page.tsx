import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { getPublishedPosts, getTags } from "@/lib/blog";
import { PostCard, PostCover } from "@/components/marketing/Blog";
import { PreferredSourceLink } from "@/components/marketing/PreferredSource";
import { formatDate } from "@/lib/blog";
import { absUrl, jsonLd, site } from "@/lib/site";

export const revalidate = 300;

export const metadata: Metadata = pageMeta({
  title: "Blog — email deliverability, guides and product news",
  description: "Practical guides on email deliverability, SPF/DKIM/DMARC, transactional email, webhooks and building with the Stack Emails API.",
  path: "/blog",
});
metadata.alternates = { canonical: "/blog", types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: `${site.name} Blog` }] } };

export default async function BlogIndex() {
  const [posts, tags] = await Promise.all([getPublishedPosts(), getTags()]);
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p !== featured);

  const ld = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": absUrl("/blog#blog"),
    url: absUrl("/blog"),
    name: `${site.name} Blog`,
    publisher: { "@id": absUrl("/#organization") },
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: absUrl(`/blog/${p.slug}`),
      datePublished: new Date(p.publishedAt).toISOString(),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <section className="relative overflow-hidden">
        <div className="m-hero-bg" aria-hidden>
          <span className="m-blob m-blob-a" />
          <span className="m-blob m-blob-b" style={{ opacity: 0.7 }} />
        </div>
        <div className="relative z-[1] m-container pt-32 pb-12">
        <p className="m-eyebrow">Blog</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <h1 className="m-display m-h1 max-w-[16ch]">Notes on sending <span className="m-highlight">great email.</span></h1>
          <div className="flex flex-wrap items-center gap-3">
            <PreferredSourceLink />
            <a href="/blog/rss.xml" className="m-btn m-btn-light m-btn-sm">RSS feed</a>
          </div>
        </div>
      </div>
      </section>

      {featured ? (
        <section className="m-container pb-16">
          <Link href={`/blog/${featured.slug}`} data-reveal className="group grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
            <PostCover post={featured} size="lg" />
            <div>
              <p className="text-[13px]" style={{ color: "var(--m-faint)" }}>Featured · <time dateTime={new Date(featured.publishedAt).toISOString()}>{formatDate(featured.publishedAt)}</time> · {featured.readingMinutes} min read</p>
              <h2 className="m-h2 mt-3 transition-colors group-hover:text-[var(--m-accent)]">{featured.title}</h2>
              <p className="m-lead mt-4">{featured.excerpt}</p>
              <p className="mt-6 text-sm font-medium" style={{ color: "var(--m-ink)" }}>Read article →</p>
            </div>
          </Link>
        </section>
      ) : (
        <section className="m-container pb-24"><p className="m-lead">No articles yet — check back soon.</p></section>
      )}

      {tags.length > 0 && (
        <nav className="m-container pb-10" aria-label="Topics">
          <div className="flex flex-wrap gap-2 border-t pt-8" style={{ borderColor: "var(--m-line)" }}>
            {tags.map((t) => (
              <Link key={t.slug} href={`/blog/tag/${t.slug}`} className="rounded-full border px-3.5 py-1.5 text-[13px] transition hover:border-[var(--m-ink)]" style={{ borderColor: "var(--m-line)", color: "var(--m-text)" }}>
                {t.tag} <span style={{ color: "var(--m-faint)" }}>{t.count}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {rest.length > 0 && (
        <section className="m-container pb-24">
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((p) => <PostCard key={p.slug} post={p} />)}
          </div>
        </section>
      )}
    </>
  );
}
