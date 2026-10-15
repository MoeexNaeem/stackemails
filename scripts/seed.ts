/**
 * Manually seed demo data. Use when MONGODB_URI points at a real database
 * (Atlas / local). In zero-infra dev mode this also runs on first boot.
 *
 *   npm run seed
 *
 * Tenant login:  demo@nanosend.dev  / password123
 * Admin login:   admin@nanosend.dev / admin123
 */
import "dotenv/config";
import { seedDemoData } from "@/lib/db/seed-data";
import { seedAdminData } from "@/lib/db/seed-admin";

async function main() {
  const result = await seedDemoData();
  await seedAdminData();

  if (result) {
    console.log("\n✅ Demo tenant seeded.");
    console.log("   Login:   demo@nanosend.dev / password123");
    console.log(`   API key: ${result.apiKey}`);
  } else {
    console.log("\n✅ Demo tenant already existed.");
  }
  console.log("\n✅ Admin + plans + sample tenants seeded.");
  console.log("   Admin:   admin@nanosend.dev / admin123 → /admin\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
