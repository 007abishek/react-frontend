import "dotenv/config";
import path from "path";
import db from "../config/knex";

async function run(): Promise<void> {
  try {
    const migrationsDir = path.resolve(process.cwd(), "hasura", "migrations");
    const [batchNo, log] = await db.migrate.latest({ directory: migrationsDir });

    if (log.length === 0) {
      console.log("No new migrations to apply.");
      return;
    }

    console.log(`Migration batch ${batchNo} applied:`);
    for (const file of log) {
      console.log(`- ${file}`);
    }
  } finally {
    await db.destroy();
  }
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
