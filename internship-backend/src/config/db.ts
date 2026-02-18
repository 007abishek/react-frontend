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
     

    await pool.query(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id         SERIAL        PRIMARY KEY,
    user_id    INTEGER       NOT NULL REFERENCES users(id)
                             ON DELETE CASCADE,
    product_id INTEGER       NOT NULL,
    title      TEXT          NOT NULL,
    price      NUMERIC(10,2) NOT NULL,
    thumbnail  TEXT,
    images     TEXT[]        DEFAULT '{}',
    quantity   INTEGER       NOT NULL DEFAULT 1,
    created_at TIMESTAMP     DEFAULT NOW(),
    updated_at TIMESTAMP     DEFAULT NOW(),
    UNIQUE(user_id, product_id)
  )
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_cart_items_user_id
  ON cart_items(user_id)
`);


    console.log("✅ Database ready");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

export { pool, initDb };