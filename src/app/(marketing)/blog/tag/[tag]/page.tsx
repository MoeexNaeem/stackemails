import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPosts, getTags, tagSlug } from "@/lib/blog";
import { PostCard } from "@/components/marketing/Blog";
import { absUrl, jsonLd, site } from "@/lib/site";
import { Icon } from "@/components/ui/Icon";

export const revalidate = 300;
export const dynamicParams = true;

type Props = { params: Promise<{ tag: string }> };

export async function generateStaticParams() {
  return (await getTags()).map((t) => ({ tag: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const found = (await getTags()).find((t) => t.slug === tag);
  if (!found) return { title: "Topic not found", robots: { index: false } };
  return pageMeta({
    title: `Articles about ${found.tag}`,
    description: `Stack Emails articles about ${found.tag}: ${found.count} guide${found.count === 1 ? "" : "s"} on email delivery and building with email.`,
    path: `/blog/tag/${found.slug}`,
  });
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const [tags, posts] = await Promise.all([getTags(), getPublishedPosts()]);
  const found = tags.find((t) => t.slug === tag);
  if (!found) notFound();
  const list = posts.filter((p) => p.tags.some((t) => tagSlug(t) === tag));

  const ld = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: absUrl(`/blog/tag/${tag}`),
    name: `${found.tag} · ${site.name} Blog`,
    isPartOf: { "@id": absUrl("/blog#blog") },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: absUrl("/blog") },
        { "@type": "ListItem", position: 2, name: found.tag, item: absUrl(`/blog/tag/${tag}`) },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <section className="m-container pt-32 pb-12">
        <Link href="/blog" className="text-[13px] hover:text-[var(--m-head)]" style={{ color: "var(--m-faint)" }}><Icon name="arrow-left" size={14} className="mr-1" />All articles</Link>
        <h1 className="m-display m-h1 mt-5">#{found.tag}</h1>
        <p className="m-lead mt-4">{found.count} article{found.count === 1 ? "" : "s"}</p>
      </section>
      <section className="m-container pb-24">
        <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <PostCard key={p.slug} post={p} />)}
        </div>
      </section>
    </>
  );
}
