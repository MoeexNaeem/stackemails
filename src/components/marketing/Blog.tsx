import Link from "next/link";
import { formatDate, type Post } from "@/lib/blog";

const PALETTES: Record<string, [string, string, string]> = {
  Deliverability: ["#d5d1f4", "#7366fe", "#15171a"],
  Tutorials: ["#e9ffb0", "#5b7d00", "#15171a"],
  Product: ["#ffe4a8", "#c27b00", "#15171a"],
  Guides: ["#dff1ee", "#11786a", "#15171a"],
};

/** Typographic cover used when a post has no image - consistent, fast, no CLS. */
export function PostCover({ post, size = "md" }: { post: Pick<Post, "title" | "category" | "coverImage" | "coverAlt">; size?: "md" | "lg" }) {
  if (post.coverImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={post.coverImage} alt={post.coverAlt || post.title} className="aspect-[16/9] w-full rounded-[22px] object-cover" loading={size === "lg" ? "eager" : "lazy"} />
    );
  }
  const [bg, accent, ink] = PALETTES[post.category] ?? PALETTES.Guides;
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[22px] transition-transform duration-500 group-hover:scale-[1.015]" style={{ background: bg }} aria-hidden>
      <span className="absolute -left-10 -top-16 h-48 w-48 rounded-full opacity-50 blur-2xl" style={{ background: accent }} />
      <svg className="absolute -right-10 -bottom-10 h-[75%] opacity-25 transition-transform duration-700 group-hover:-translate-y-2 group-hover:rotate-[-4deg]" viewBox="0 0 200 200" fill="none" stroke={accent} strokeWidth="10">
        <rect x="20" y="50" width="160" height="110" rx="18" />
        <path d="M24 60l76 56 76-56" />
      </svg>
      <span className="absolute left-5 top-5 rounded-full px-3 py-1 text-[11.5px] font-medium" style={{ background: "rgba(255,255,255,.7)", color: ink }}>{post.category}</span>
      <p className={`absolute bottom-5 left-5 right-12 font-semibold tracking-[-0.025em] ${size === "lg" ? "text-[26px] leading-[1.1] sm:text-[34px]" : "text-[19px] leading-[1.15]"}`} style={{ color: ink }}>
        {post.title}
      </p>
    </div>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <article data-reveal className="group">
      <Link href={`/blog/${post.slug}`} className="block">
        <PostCover post={post} />
        <p className="mt-4 text-[13px]" style={{ color: "var(--m-faint)" }}>
          <time dateTime={new Date(post.publishedAt).toISOString()}>{formatDate(post.publishedAt)}</time> · {post.readingMinutes} min read
        </p>
        <h3 className="m-h3 mt-1.5 transition-colors group-hover:text-[var(--m-accent)]">{post.title}</h3>
        <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed" style={{ color: "var(--m-muted)" }}>{post.excerpt}</p>
      </Link>
    </article>
  );
}
