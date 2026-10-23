import { ogCard, OG_SIZE } from "@/lib/og";
import { formatDate, getPost } from "@/lib/blog";

export const alt = "Stack Emails blog article";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 300;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  return ogCard({
    eyebrow: post?.category ?? "Blog",
    title: post?.title ?? "Stack Emails Blog",
    footer: post ? `${formatDate(post.publishedAt)} · ${post.readingMinutes} min read` : undefined,
  });
}
