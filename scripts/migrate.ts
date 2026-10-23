/**
 * Idempotent data migrations. Safe to run repeatedly.
 *
 *   npm run migrate
 *
 * 1. Contacts → team-wide model: legacy `audienceId` becomes a segment
 *    membership, duplicate (team, email) rows are merged, and the old
 *    per-audience unique index is replaced by the per-team one.
 * 2. Every team has at least one segment ("General").
 * 3. Indexes for all models are synced.
 * 4. Daily stats are backfilled and launch blog articles inserted.
 * 5. Platform admin is synced from ADMIN_EMAIL / ADMIN_PASSWORD.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/connect";
import * as Models from "@/lib/db/models";
import { syncPlatformAdmin } from "@/lib/admin-account";

const { Contact, Segment, Workspace } = Models;

async function migrateContacts() {
  const coll = Contact.collection;
  // a) legacy audienceId → segmentIds
  const moved = await coll.updateMany(
    { audienceId: { $exists: true, $ne: null } },
    [{ $set: { segmentIds: { $setUnion: [{ $ifNull: ["$segmentIds", []] }, ["$audienceId"]] } } }],
  );
  console.log(`  contacts: linked ${moved.modifiedCount} legacy audience memberships`);

  // b) drop the old per-audience unique index before merging duplicates
  const indexes = await coll.indexes();
  for (const ix of indexes) {
    if (ix.name === "audienceId_1_email_1") {
      await coll.dropIndex(ix.name);
      console.log("  contacts: dropped legacy index audienceId_1_email_1");
    }
  }

  // c) merge duplicates per (workspaceId, email), keeping the oldest row
  const dups = await coll
    .aggregate<{ _id: { w: unknown; e: string }; ids: mongoose.Types.ObjectId[] }>([
      { $sort: { createdAt: 1 } },
      { $group: { _id: { w: "$workspaceId", e: "$email" }, ids: { $push: "$_id" }, n: { $sum: 1 } } },
      { $match: { n: { $gt: 1 } } },
    ])
    .toArray();
  let removed = 0;
  for (const d of dups) {
    const [keep, ...rest] = d.ids;
    const others = await coll.find({ _id: { $in: rest } }).toArray();
    const segs = others.flatMap((o) => (o.segmentIds as unknown[]) ?? []);
    const unsub = others.some((o) => o.unsubscribed);
    await coll.updateOne({ _id: keep }, { $addToSet: { segmentIds: { $each: segs } }, ...(unsub ? { $set: { unsubscribed: true } } : {}) });
    const r = await coll.deleteMany({ _id: { $in: rest } });
    removed += r.deletedCount;
  }
  console.log(`  contacts: merged ${dups.length} duplicate groups (${removed} rows removed)`);

  // d) defaults for new fields
  await coll.updateMany({ segmentIds: { $exists: false } }, { $set: { segmentIds: [] } });
  await coll.updateMany({ properties: { $exists: false } }, { $set: { properties: {} } });
  await coll.updateMany({ topics: { $exists: false } }, { $set: { topics: [] } });
}

async function ensureDefaultSegments() {
  let created = 0;
  for await (const ws of Workspace.find().select("_id").lean().cursor()) {
    if (!(await Segment.exists({ workspaceId: ws._id }))) {
      await Segment.create({ workspaceId: ws._id, name: "General" });
      created++;
    }
  }
  console.log(`  segments: created ${created} default "General" segments`);
}

/** Rebuild the daily rollup from retained EmailLogs (logs are the source of truth for their days). */
async function backfillDailyStats() {
  const rows = await Models.EmailLog.aggregate([
    {
      $project: {
        workspaceId: 1,
        day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        domain: { $toLower: { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: [{ $ifNull: [{ $arrayElemAt: [{ $split: ["$from", "<"] }, 1] }, "$from"] }, "@"] }, 1] }, ">"] }, 0] } },
        status: 1,
        bounceType: 1,
        opens: 1,
        clicks: 1,
      },
    },
    {
      $group: {
        _id: { w: "$workspaceId", day: "$day", domain: "$domain" },
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $in: ["$status", ["sent", "delivered", "bounced", "complained", "delivery_delayed"]] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] } },
        bounced: { $sum: { $cond: [{ $eq: ["$status", "bounced"] }, 1, 0] } },
        bouncePermanent: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "bounced"] }, { $eq: ["$bounceType", "Permanent"] }] }, 1, 0] } },
        bounceTransient: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "bounced"] }, { $eq: ["$bounceType", "Transient"] }] }, 1, 0] } },
        complained: { $sum: { $cond: [{ $eq: ["$status", "complained"] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
        opened: { $sum: { $cond: [{ $gt: ["$opens", 0] }, 1, 0] } },
        clicked: { $sum: { $cond: [{ $gt: ["$clicks", 0] }, 1, 0] } },
      },
    },
  ]);
  for (const r of rows) {
    const { w, day, domain } = r._id;
    const { _id, ...counts } = r;
    void _id;
    await Models.DailyStat.updateOne({ workspaceId: w, day, domain: domain ?? "" }, { $set: counts }, { upsert: true });
  }
  console.log(`  stats: backfilled ${rows.length} day/domain rows from email logs`);
}

async function syncIndexes() {
  for (const [name, m] of Object.entries(Models)) {
    if (m && typeof m === "function" && "syncIndexes" in m && typeof (m as mongoose.Model<unknown>).syncIndexes === "function") {
      try {
        await (m as mongoose.Model<unknown>).syncIndexes();
      } catch (e) {
        console.warn(`  indexes: ${name} — ${(e as Error).message}`);
      }
    }
  }
  console.log("  indexes: synced");
}

/** Insert any launch blog articles that aren't in the database yet (by slug). */
async function seedBlog() {
  const { SEED_POSTS } = await import("@/content/blog-posts");
  const { readingMinutes } = await import("@/lib/markdown");
  let added = 0;
  for (const p of SEED_POSTS) {
    const res = await Models.BlogPost.updateOne(
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
    if (res.upsertedCount) added++;
  }
  console.log(`  blog: inserted ${added} launch article(s)`);
}

async function main() {
  await connectToDatabase();
  console.log("Running migrations…");
  await migrateContacts();
  await ensureDefaultSegments();
  await syncIndexes();
  await backfillDailyStats();
  await seedBlog();
  const admin = await syncPlatformAdmin();
  if (admin) {
    console.log(`  admin: ${admin.email} ${admin.created ? "created" : "updated"} as platform admin${admin.demotedLegacy ? " (legacy admin@stackemails.com demoted)" : ""}`);
  } else {
    console.log("  admin: ADMIN_EMAIL / ADMIN_PASSWORD not set — skipped");
  }
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
