import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

const initDb = async (): Promise<void> => {
  try {
    /* =========================
       USERS TABLE
    ========================== */
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

    /* =========================
       PRODUCTS TABLE
    ========================== */
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

    /* =========================
       CART ITEMS TABLE
    ========================== */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id         SERIAL        PRIMARY KEY,
        user_id    INTEGER       NOT NULL
                    REFERENCES users(id)
                    ON DELETE CASCADE,
        product_id INTEGER       NOT NULL,
        title      TEXT          NOT NULL,
        price      NUMERIC(10,2) NOT NULL,
        thumbnail  TEXT,
        images     TEXT[]        DEFAULT '{}',
        quantity   INTEGER       NOT NULL DEFAULT 1 CHECK (quantity > 0),
        created_at TIMESTAMP     DEFAULT NOW(),
        updated_at TIMESTAMP     DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cart_items_user_id
      ON cart_items(user_id)
    `);

    /* =========================
       SAFE FOREIGN KEY ADDITION
       (cart_items.product_id → products.id)
    ========================== */
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'cart_items_product_id_fkey'
        ) THEN
          ALTER TABLE cart_items
          ADD CONSTRAINT cart_items_product_id_fkey
          FOREIGN KEY (product_id)
          REFERENCES products(id)
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    /* =========================
       INVENTORY RESERVATIONS TABLE
    ========================== */
    await pool.query(`
  CREATE TABLE IF NOT EXISTS inventory_reservations (
    id              SERIAL        PRIMARY KEY,
    user_id         INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id      INTEGER       NOT NULL REFERENCES products(id),
    quantity        INTEGER       NOT NULL,
    status          TEXT          NOT NULL DEFAULT 'pending',
    expires_at      TIMESTAMP     NOT NULL,
    created_at      TIMESTAMP     DEFAULT NOW(),
    CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled'))
  )
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status
  ON inventory_reservations(status)
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires
  ON inventory_reservations(expires_at)
  WHERE status = 'pending'
`);

    

    console.log("✅ Database ready (Phase 3 supported)");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

export { pool, initDb };
