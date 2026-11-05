/**
 * Insert bundled blog articles (src/content/blog-posts*.ts) that aren't in the
 * database yet, matched by slug. Existing posts are never modified, so edits
 * made in Admin > Blog are safe. Touches nothing but the BlogPost collection.
 *
 *   npm run blog:sync            insert missing posts
 *   npm run blog:sync -- --dry   list what would be inserted
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import { BlogPost } from "@/lib/db/models";
import { SEED_POSTS } from "@/content/blog-posts";
import { readingMinutes } from "@/lib/markdown";

async function main() {
  const dry = process.argv.includes("--dry");
  await connectToDatabase();
  const existing = new Set((await BlogPost.find().select("slug").lean()).map((p) => p.slug));
  const missing = SEED_POSTS.filter((p) => !existing.has(p.slug));
  console.log(`${SEED_POSTS.length} bundled articles, ${missing.length} missing from the database${dry ? " (dry run)" : ""}`);
  for (const p of missing) {
    console.log(`  + ${p.slug}`);
    if (dry) continue;
    await BlogPost.updateOne(
      { slug: p.slug },
      {
        $setOnInsert: {
          slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content, category: p.category, tags: p.tags,
          featured: !!p.featured, status: "published", publishedAt: new Date(p.publishedAt),
          seoTitle: p.seoTitle ?? "", seoDescription: p.seoDescription ?? "", readingMinutes: readingMinutes(p.content),
        },
      },
      { upsert: true },
    );
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
