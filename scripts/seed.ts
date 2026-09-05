/**
 * Manually seed the demo account. Useful when you've set MONGODB_URI to a real
 * database (Atlas / local) and want demo data in it.
 *
 * In the default zero-infra dev mode this runs automatically on first boot, so
 * you usually don't need this script.
 *
 *   npm run seed
 *
 * Login:  demo@nanosend.dev  /  password123
 */
import "dotenv/config";
import { seedDemoData } from "@/lib/db/seed-data";

async function main() {
  const result = await seedDemoData();
  if (!result) {
    console.log("Demo account already exists — skipping.");
    return;
  }
  console.log("\n✅ Seed complete.\n");
  console.log("   Login:   demo@nanosend.dev / password123");
  console.log(`   API key: ${result.apiKey}`);
  console.log("            (this is the only time it's shown)\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
