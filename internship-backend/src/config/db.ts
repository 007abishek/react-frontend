import path from "path";
import { Pool } from "pg";
import db from "./knex";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const initDb = async (): Promise<void> => {
  try {
    // Ensure DB is reachable before attempting migrations.
    await pool.query("SELECT 1");

    const migrationsDir = path.resolve(process.cwd(), "hasura", "migrations");
    await db.migrate.latest({ directory: migrationsDir });

    console.log("Database ready (migrations applied)");
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

export { pool, initDb };
