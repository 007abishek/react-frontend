import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const initDb = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL PRIMARY KEY,
        firebase_uid TEXT    UNIQUE NOT NULL,
        email        TEXT    UNIQUE,
        provider     TEXT    NOT NULL DEFAULT 'password',
        is_guest     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL        PRIMARY KEY,
        external_id INTEGER       UNIQUE,
        title       TEXT          NOT NULL,
        description TEXT,
        price       NUMERIC(10,2) NOT NULL,
        category    TEXT          NOT NULL,
        thumbnail   TEXT,
        images      TEXT[]        DEFAULT '{}',
        rating      NUMERIC(3,2)  DEFAULT 0,
        stock       INTEGER       NOT NULL DEFAULT 0,
        brand       TEXT,
        created_at  TIMESTAMP     DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category
      ON products(category)
    `);

    console.log("✅ Database ready");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

export { pool, initDb };