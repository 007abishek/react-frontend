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

await pool.query(`
  ALTER TABLE inventory_reservations
  ADD COLUMN IF NOT EXISTS order_external_id TEXT
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_external_id
  ON inventory_reservations(order_external_id)
`);

   /* ============================
       ORDERS TABLE
      ==========================*/
  await pool.query(`
  CREATE TABLE IF NOT EXISTS orders (
    id              SERIAL        PRIMARY KEY,
    user_id         INTEGER       NOT NULL REFERENCES users(id),
    firebase_uid    TEXT          NOT NULL,
    order_id        TEXT          UNIQUE NOT NULL,
    status          TEXT          NOT NULL DEFAULT 'pending',
    payment_method  TEXT          NOT NULL,
    subtotal        NUMERIC(10,2) NOT NULL,
    total           NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMP     DEFAULT NOW(),
    updated_at      TIMESTAMP     DEFAULT NOW(),
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'))
  )
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL        PRIMARY KEY,
    order_id    INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  INTEGER       NOT NULL,
    title       TEXT          NOT NULL,
    price       NUMERIC(10,2) NOT NULL,
    thumbnail   TEXT,
    quantity    INTEGER       NOT NULL,
    created_at  TIMESTAMP     DEFAULT NOW()
  )
`);

await pool.query(`
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_name = 'order_items_product_id_fkey'
    ) THEN
      ALTER TABLE order_items
      ADD CONSTRAINT order_items_product_id_fkey
      FOREIGN KEY (product_id)
      REFERENCES products(id)
      ON DELETE RESTRICT;
    END IF;
  END $$;
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS shipping_addresses (
    id            SERIAL    PRIMARY KEY,
    order_id      INTEGER   UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    full_name     TEXT      NOT NULL,
    phone         TEXT      NOT NULL,
    email         TEXT      NOT NULL,
    address_line1 TEXT      NOT NULL,
    address_line2 TEXT,
    city          TEXT      NOT NULL,
    state         TEXT      NOT NULL,
    pincode       TEXT      NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
  )
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id)
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)
`);


await pool.query(`
  CREATE TABLE IF NOT EXISTS payments (
    id                   SERIAL        PRIMARY KEY,
    order_id             INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id              INTEGER       NOT NULL REFERENCES users(id),
    provider             TEXT          NOT NULL DEFAULT 'stripe',
    amount               NUMERIC(10,2) NOT NULL,
    currency             TEXT          NOT NULL DEFAULT 'inr',
    status               TEXT          NOT NULL DEFAULT 'pending',
    stripe_payment_intent_id TEXT      UNIQUE,
    stripe_payment_method TEXT,
    created_at           TIMESTAMP     DEFAULT NOW(),
    updated_at           TIMESTAMP     DEFAULT NOW(),
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled'))
  )
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_payments_order_id
  ON payments(order_id)
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent
  ON payments(stripe_payment_intent_id)
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS checkout_idempotency (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key   TEXT      NOT NULL,
    request_hash      TEXT      NOT NULL,
    order_external_id TEXT,
    expires_at        TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, idempotency_key)
  )
`);

await pool.query(`
  ALTER TABLE checkout_idempotency
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_order_external_id
  ON checkout_idempotency(order_external_id)
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_expires_at
  ON checkout_idempotency(expires_at)
`);

  

    console.log("✅ Database ready (Phase 3 supported)");
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    throw error;
  }
};

export { pool, initDb };
