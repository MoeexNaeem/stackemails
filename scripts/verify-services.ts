/**
 * Verify connectivity to the external services configured in .env:
 * MongoDB, Redis, and Amazon SES. Read-only — never sends email.
 *
 *   npm run verify
 */
import "dotenv/config";
import { env } from "@/lib/env";

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

function line(r: Result) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.name}\n   ${r.detail}\n`);
  results.push(r);
}

async function checkMongo() {
  if (!env.mongoUri) {
    line({ name: "MongoDB", ok: true, detail: "No MONGODB_URI — using in-process memory-server (local mode)." });
    return;
  }
  try {
    const mongoose = (await import("mongoose")).default;
    const conn = await mongoose.createConnection(env.mongoUri, {
      dbName: env.mongoDbName,
      serverSelectionTimeoutMS: 8000,
    }).asPromise();
    const admin = conn.db!.admin();
    const info = await admin.serverStatus();
    await conn.close();
    line({
      name: "MongoDB (Atlas)",
      ok: true,
      detail: `Connected to "${env.mongoDbName}" — MongoDB ${info.version}, host ${info.host}.`,
    });
  } catch (err) {
    line({
      name: "MongoDB (Atlas)",
      ok: false,
      detail: `${(err as Error).message}\n   → Common cause: your IP isn't allowlisted. In Atlas: Network Access → Add IP Address → Allow from anywhere (0.0.0.0/0) for testing.`,
    });
  }
}

async function checkRedis() {
  try {
    const { default: Redis } = await import("ioredis");
    const redis = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: 8000,
      lazyConnect: true,
    });
    await redis.connect();
    const pong = await redis.ping();
    await redis.set("stackemails:verify", "ok", "EX", 30);
    const val = await redis.get("stackemails:verify");
    redis.disconnect();
    line({
      name: "Redis",
      ok: pong === "PONG" && val === "ok",
      detail: `PING → ${pong}, set/get round-trip OK (${env.redisUrl.split("@")[1] ?? "local"}).`,
    });
  } catch (err) {
    line({ name: "Redis", ok: false, detail: (err as Error).message });
  }
}

async function checkSes() {
  if (!env.aws.accessKeyId || !env.aws.secretAccessKey) {
    line({ name: "Amazon SES", ok: false, detail: "AWS credentials not set in .env." });
    return;
  }
  try {
    const { SESv2Client, GetAccountCommand, ListEmailIdentitiesCommand } = await import(
      "@aws-sdk/client-sesv2"
    );
    const client = new SESv2Client({
      region: env.aws.region,
      credentials: {
        accessKeyId: env.aws.accessKeyId,
        secretAccessKey: env.aws.secretAccessKey,
      },
    });

    const account = await client.send(new GetAccountCommand({}));
    const identities = await client.send(new ListEmailIdentitiesCommand({}));
    const verified = (identities.EmailIdentities ?? []).filter((i) => i.SendingEnabled);

    const sandbox = !account.ProductionAccessEnabled;
    line({
      name: "Amazon SES",
      ok: Boolean(account.SendingEnabled),
      detail:
        `Region ${env.aws.region} · sending ${account.SendingEnabled ? "ENABLED" : "DISABLED"} · ` +
        `${sandbox ? "SANDBOX (verified recipients only)" : "PRODUCTION"} · ` +
        `quota ${account.SendQuota?.Max24HourSend ?? "?"}/24h.\n` +
        `   Identities: ${
          (identities.EmailIdentities ?? []).length === 0
            ? "none yet — verify a domain to send from it."
            : (identities.EmailIdentities ?? [])
                .map((i) => `${i.IdentityName}${i.SendingEnabled ? " ✓" : " (pending)"}`)
                .join(", ")
        }\n   Verified & ready: ${verified.length}.`,
    });
  } catch (err) {
    line({
      name: "Amazon SES",
      ok: false,
      detail: `${(err as Error).name}: ${(err as Error).message}\n   → Check the access key/secret and that AWS_REGION matches where you're working.`,
    });
  }
}

async function main() {
  console.log("\nVerifying Stack Emails external services…\n");
  await checkMongo();
  await checkRedis();
  await checkSes();

  const failed = results.filter((r) => !r.ok);
  console.log("─".repeat(50));
  console.log(failed.length === 0 ? "All services reachable. 🎉" : `${failed.length} check(s) need attention.`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main();
