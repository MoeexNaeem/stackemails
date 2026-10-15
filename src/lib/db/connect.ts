import mongoose from "mongoose";
import path from "node:path";
import { env } from "@/lib/env";

/**
 * Mongoose connection manager.
 *
 * Two modes:
 *  1. MONGODB_URI is set  → connect to that (Atlas / self-hosted).
 *  2. MONGODB_URI is empty → boot an in-process MongoDB via
 *     `mongodb-memory-server`, persisting data under ./.mongo-data so it
 *     survives restarts. This makes local development zero-config.
 *
 * The connection promise is cached on globalThis so Next.js hot-reload and
 * multiple route invocations reuse a single connection.
 */

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer: unknown | null;
  seedPromise: Promise<void> | null;
};

const globalForMongoose = globalThis as unknown as {
  __nanosendMongoose?: Cache;
};

const cache: Cache =
  globalForMongoose.__nanosendMongoose ??
  (globalForMongoose.__nanosendMongoose = {
    conn: null,
    promise: null,
    memoryServer: null,
    seedPromise: null,
  });

async function resolveUri(): Promise<string> {
  if (env.mongoUri) return env.mongoUri;

  // Lazy-load so production bundles that supply MONGODB_URI never touch it.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  // Keep data under node_modules/.cache so the bundler never traces it (a
  // running mongod locks files here, which breaks project-root file tracing).
  const dbPath = path.join(process.cwd(), "node_modules", ".cache", "nanosend-mongo");
  const fs = await import("node:fs");
  fs.mkdirSync(dbPath, { recursive: true });

  const server = await MongoMemoryServer.create({
    instance: {
      dbName: env.mongoDbName,
      dbPath,
      // Persist data between runs instead of wiping on shutdown.
      storageEngine: "wiredTiger",
    },
  });
  cache.memoryServer = server;
  const uri = server.getUri();
  console.log("[db] started in-process MongoDB (mongodb-memory-server)");
  return uri;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = resolveUri().then((uri) =>
      mongoose.connect(uri, {
        dbName: env.mongoDbName,
        maxPoolSize: 20,
      }),
    );
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  // In zero-infra dev mode (no external Mongo), auto-seed the demo data once so
  // the dashboard is never empty. A single shared promise guarantees that EVERY
  // caller — including concurrent first requests — waits for seeding to finish
  // before returning, so the very first login can't race the seed.
  // Never touches a user-provided database.
  if (!env.mongoUri) {
    if (!cache.seedPromise) {
      cache.seedPromise = (async () => {
        try {
          const { seedDemoData } = await import("@/lib/db/seed-data");
          const { seedAdminData } = await import("@/lib/db/seed-admin");
          const result = await seedDemoData();
          await seedAdminData();
          if (result) {
            console.log(
              `[db] seeded demo account — login: demo@nanosend.dev / password123 | api key: ${result.apiKey}`,
            );
          }
        } catch (err) {
          console.warn("[db] demo seed skipped:", (err as Error).message);
        }
      })();
    }
    await cache.seedPromise;
  }

  return cache.conn;
}
