/**
 * Baseline schema migration.
 * Source of truth for database structure should live in migrations, not app startup SQL.
 */

/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function up(knex) {
  const hasUsers = await knex.schema.hasTable("users");
  if (!hasUsers) {
    await knex.schema.createTable("users", (table) => {
      table.increments("id").primary();
      table.text("firebase_uid").notNullable().unique();
      table.text("email").unique();
      table.text("provider").notNullable().defaultTo("password");
      table.boolean("is_guest").notNullable().defaultTo(false);
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }

  const hasProducts = await knex.schema.hasTable("products");
  if (!hasProducts) {
    await knex.schema.createTable("products", (table) => {
      table.increments("id").primary();
      table.integer("external_id").unique();
      table.text("title").notNullable();
      table.text("description");
      table.decimal("price", 10, 2).notNullable();
      table.text("category").notNullable();
      table.text("thumbnail");
      table.specificType("images", "TEXT[]").defaultTo("{}");
      table.decimal("rating", 3, 2).defaultTo(0);
      table.integer("stock").notNullable().defaultTo(0);
      table.text("brand");
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_products_category
    ON products(category)
  `);

  const hasCartItems = await knex.schema.hasTable("cart_items");
  if (!hasCartItems) {
    await knex.schema.createTable("cart_items", (table) => {
      table.increments("id").primary();
      table.integer("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.integer("product_id").notNullable();
      table.text("title").notNullable();
      table.decimal("price", 10, 2).notNullable();
      table.text("thumbnail");
      table.specificType("images", "TEXT[]").defaultTo("{}");
      table.integer("quantity").notNullable().defaultTo(1);
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["user_id", "product_id"]);
    });
  }
  await knex.raw(`
    ALTER TABLE cart_items
    DROP CONSTRAINT IF EXISTS cart_items_quantity_check
  `);
  await knex.raw(`
    ALTER TABLE cart_items
    ADD CONSTRAINT cart_items_quantity_check CHECK (quantity > 0)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_cart_items_user_id
    ON cart_items(user_id)
  `);
  await knex.raw(`
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

  const hasInventoryReservations = await knex.schema.hasTable("inventory_reservations");
  if (!hasInventoryReservations) {
    await knex.schema.createTable("inventory_reservations", (table) => {
      table.increments("id").primary();
      table.integer("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.integer("product_id").notNullable().references("id").inTable("products");
      table.integer("quantity").notNullable();
      table.text("status").notNullable().defaultTo("pending");
      table.timestamp("expires_at").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.text("order_external_id");
    });
  }
  await knex.raw(`
    ALTER TABLE inventory_reservations
    DROP CONSTRAINT IF EXISTS inventory_reservations_status_check
  `);
  await knex.raw(`
    ALTER TABLE inventory_reservations
    ADD CONSTRAINT inventory_reservations_status_check
    CHECK (status IN ('pending', 'confirmed', 'expired', 'cancelled'))
  `);
  await knex.raw(`
    ALTER TABLE inventory_reservations
    ADD COLUMN IF NOT EXISTS order_external_id TEXT
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status
    ON inventory_reservations(status)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires
    ON inventory_reservations(expires_at)
    WHERE status = 'pending'
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_external_id
    ON inventory_reservations(order_external_id)
  `);

  const hasOrders = await knex.schema.hasTable("orders");
  if (!hasOrders) {
    await knex.schema.createTable("orders", (table) => {
      table.increments("id").primary();
      table.integer("user_id").notNullable().references("id").inTable("users");
      table.text("firebase_uid").notNullable();
      table.text("order_id").notNullable().unique();
      table.text("status").notNullable().defaultTo("pending");
      table.text("payment_method").notNullable();
      table.decimal("subtotal", 10, 2).notNullable();
      table.decimal("total", 10, 2).notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }
  await knex.raw(`
    ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_status_check
  `);
  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'))
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_orders_user_id
    ON orders(user_id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_orders_order_id
    ON orders(order_id)
  `);

  const hasOrderItems = await knex.schema.hasTable("order_items");
  if (!hasOrderItems) {
    await knex.schema.createTable("order_items", (table) => {
      table.increments("id").primary();
      table.integer("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
      table.integer("product_id").notNullable();
      table.text("title").notNullable();
      table.decimal("price", 10, 2).notNullable();
      table.text("thumbnail");
      table.integer("quantity").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id
    ON order_items(order_id)
  `);
  await knex.raw(`
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

  const hasShippingAddresses = await knex.schema.hasTable("shipping_addresses");
  if (!hasShippingAddresses) {
    await knex.schema.createTable("shipping_addresses", (table) => {
      table.increments("id").primary();
      table.integer("order_id").notNullable().unique().references("id").inTable("orders").onDelete("CASCADE");
      table.text("full_name").notNullable();
      table.text("phone").notNullable();
      table.text("email").notNullable();
      table.text("address_line1").notNullable();
      table.text("address_line2");
      table.text("city").notNullable();
      table.text("state").notNullable();
      table.text("pincode").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
    });
  }

  const hasPayments = await knex.schema.hasTable("payments");
  if (!hasPayments) {
    await knex.schema.createTable("payments", (table) => {
      table.increments("id").primary();
      table.integer("order_id").notNullable().references("id").inTable("orders").onDelete("CASCADE");
      table.integer("user_id").notNullable().references("id").inTable("users");
      table.text("provider").notNullable().defaultTo("stripe");
      table.decimal("amount", 10, 2).notNullable();
      table.text("currency").notNullable().defaultTo("inr");
      table.text("status").notNullable().defaultTo("pending");
      table.text("stripe_payment_intent_id").unique();
      table.text("stripe_payment_method");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    });
  }
  await knex.raw(`
    ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_status_check
  `);
  await knex.raw(`
    ALTER TABLE payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled'))
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_payments_order_id
    ON payments(order_id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_payments_stripe_intent
    ON payments(stripe_payment_intent_id)
  `);

  const hasCheckoutIdempotency = await knex.schema.hasTable("checkout_idempotency");
  if (!hasCheckoutIdempotency) {
    await knex.schema.createTable("checkout_idempotency", (table) => {
      table.increments("id").primary();
      table.integer("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.text("idempotency_key").notNullable();
      table.text("request_hash").notNullable();
      table.text("order_external_id");
      table.timestamp("expires_at").notNullable().defaultTo(knex.raw(`NOW() + INTERVAL '24 hours'`));
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.unique(["user_id", "idempotency_key"]);
    });
  }
  await knex.raw(`
    ALTER TABLE checkout_idempotency
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_order_external_id
    ON checkout_idempotency(order_external_id)
  `);
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_expires_at
    ON checkout_idempotency(expires_at)
  `);
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("checkout_idempotency");
  await knex.schema.dropTableIfExists("payments");
  await knex.schema.dropTableIfExists("shipping_addresses");
  await knex.schema.dropTableIfExists("order_items");
  await knex.schema.dropTableIfExists("orders");
  await knex.schema.dropTableIfExists("inventory_reservations");
  await knex.schema.dropTableIfExists("cart_items");
  await knex.schema.dropTableIfExists("products");
  await knex.schema.dropTableIfExists("users");
};
