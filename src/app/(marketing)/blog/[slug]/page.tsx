import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getPost, getPublishedPosts, relatedPosts, tagSlug } from "@/lib/blog";
import { renderMarkdown, stripMarkdown } from "@/lib/markdown";
import { PostCard } from "@/components/marketing/Blog";
import { PreferredSourceLink } from "@/components/marketing/PreferredSource";
import { absUrl, jsonLd, site } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || stripMarkdown(post.content).slice(0, 155);
  return {
    ...pageMeta({
      title,
      description,
      path: `/blog/${post.slug}`,
      type: "article",
      keywords: post.tags,
      // The segment's opengraph-image renders a card per article unless there's a cover.
      images: post.coverImage ? [{ url: post.coverImage, alt: post.coverAlt || post.title }] : [],
      article: {
        publishedTime: new Date(post.publishedAt).toISOString(),
        modifiedTime: new Date(post.updatedAt).toISOString(),
        authors: [post.authorName],
        section: post.category,
        tags: post.tags,
      },
    }),
    authors: [{ name: post.authorName }],
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const [post, all] = await Promise.all([getPost(slug), getPublishedPosts()]);
  if (!post) notFound();

  const { html, toc } = renderMarkdown(post.content);
  const related = relatedPosts(post, all);
  const url = absUrl(`/blog/${post.slug}`);
  const words = stripMarkdown(post.content).split(" ").length;

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        mainEntityOfPage: url,
        url,
        headline: post.title,
        description: post.seoDescription || post.excerpt,
        datePublished: new Date(post.publishedAt).toISOString(),
        dateModified: new Date(post.updatedAt).toISOString(),
        author: { "@type": "Organization", name: post.authorName, url: site.url },
        publisher: { "@id": absUrl("/#organization") },
        image: post.coverImage || absUrl("/opengraph-image"),
        articleSection: post.category,
        keywords: post.tags.join(", "),
        wordCount: words,
        inLanguage: "en-US",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site.url },
          { "@type": "ListItem", position: 2, name: "Blog", item: absUrl("/blog") },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };

  const share = encodeURIComponent(url);
  const shareText = encodeURIComponent(post.title);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <article>
        <header className="m-container pt-32 pb-10">
          <nav aria-label="Breadcrumb" className="text-[13px]" style={{ color: "var(--m-faint)" }}>
            <Link href="/blog" className="hover:text-[var(--m-head)]">Blog</Link>
            <span className="mx-2">/</span>
            <span>{post.category}</span>
          </nav>
          <h1 className="m-display mt-6 max-w-[22ch] text-[38px] leading-[1.05] sm:text-[56px]">{post.title}</h1>
          <p className="m-lead mt-6 max-w-[680px]">{post.excerpt}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px]" style={{ color: "var(--m-muted)" }}>
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold" style={{ background: "var(--m-highlight)", color: "var(--m-head)" }}>SE</span>
              <span><span style={{ color: "var(--m-head)" }} className="font-medium">{post.authorName}</span>{post.authorRole ? ` · ${post.authorRole}` : ""}</span>
            </span>
            <time dateTime={new Date(post.publishedAt).toISOString()}>{formatDate(post.publishedAt)}</time>
            <span>{post.readingMinutes} min read</span>
          </div>
        </header>

        <div className="m-container grid gap-12 pb-20 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 max-w-[720px]">
            {post.coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.coverImage} alt={post.coverAlt || post.title} className="mb-10 w-full rounded-[22px]" />
            )}
            <div className="m-prose" dangerouslySetInnerHTML={{ __html: html }} />

            <div className="mt-14 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <Link key={t} href={`/blog/tag/${tagSlug(t)}`} className="rounded-full px-3 py-1 text-[13px]" style={{ background: "var(--m-linen)", color: "var(--m-text)" }}>#{t}</Link>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[22px] p-6" style={{ background: "var(--m-linen)" }}>
              <div>
                <p className="font-semibold" style={{ color: "var(--m-head)" }}>Enjoyed this article?</p>
                <p className="text-[14px]" style={{ color: "var(--m-muted)" }}>See more from Stack Emails in Google Search.</p>
              </div>
              <PreferredSourceLink />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-8">
              {toc.length > 1 && (
                <nav aria-label="On this page">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--m-faint)" }}>On this page</p>
                  <ul className="mt-3 space-y-2 border-l text-[13.5px]" style={{ borderColor: "var(--m-line)" }}>
                    {toc.map((t) => (
                      <li key={t.id} style={{ paddingLeft: t.depth === 3 ? 24 : 12 }}>
                        <a href={`#${t.id}`} className="block leading-snug transition-colors hover:text-[var(--m-head)]" style={{ color: "var(--m-muted)" }}>{t.text}</a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--m-faint)" }}>Share</p>
                <div className="mt-3 flex gap-2 text-[13px]">
                  <a className="m-btn m-btn-light m-btn-sm" target="_blank" rel="noopener noreferrer" href={`https://x.com/intent/post?url=${share}&text=${shareText}`}>X</a>
                  <a className="m-btn m-btn-light m-btn-sm" target="_blank" rel="noopener noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${share}`}>LinkedIn</a>
                </div>
              </div>
              <div className="rounded-[22px] p-5" style={{ background: "var(--m-dark)", border: "1px solid var(--m-dark-line)" }}>
                <p className="font-semibold text-white">Send email that lands.</p>
                <p className="mt-1.5 text-[13.5px]" style={{ color: "#94a3b8" }}>3,000 free emails every month.</p>
                <Link href="/signup" className="m-btn m-btn-lime m-btn-sm mt-4">Start for free</Link>
              </div>
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section style={{ background: "var(--m-linen)" }}>
          <div className="m-container py-20">
            <h2 className="m-h2 text-[32px]">Keep reading</h2>
            <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => <PostCard key={p.slug} post={p} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
