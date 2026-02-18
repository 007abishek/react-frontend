import { pool } from "../config/db";

/* ============================================================
   TYPES
============================================================ */

export interface ProductRow {
  id: number;
  external_id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  thumbnail: string;
  images: string[];
  rating: number;
  stock: number;
  brand: string;
}

/* ============================================================
   BASIC PRODUCT QUERIES
============================================================ */

const getAll = async (): Promise<ProductRow[]> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     ORDER BY id ASC`
  );
  return res.rows;
};

const getByCategory = async (category: string): Promise<ProductRow[]> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     WHERE LOWER(category) = LOWER($1)
     ORDER BY id ASC`,
    [category]
  );
  return res.rows;
};

const getById = async (id: number): Promise<ProductRow | null> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
};

const search = async (q: string): Promise<ProductRow[]> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     WHERE LOWER(title) LIKE LOWER($1)
     ORDER BY id ASC`,
    [`%${q}%`]
  );
  return res.rows;
};

const getTopRated = async (minRating: number): Promise<ProductRow[]> => {
  const res = await pool.query<ProductRow>(
    `SELECT id, external_id, title, description, price, category,
            thumbnail, images, rating, stock, brand
     FROM products
     WHERE rating >= $1
     ORDER BY rating DESC`,
    [minRating]
  );
  return res.rows;
};

/* ============================================================
   BULK INSERT
============================================================ */

const bulkInsert = async (
  products: Omit<ProductRow, "id">[]
): Promise<number> => {
  let inserted = 0;

  for (const p of products) {
    await pool.query(
      `INSERT INTO products
        (external_id, title, description, price, category,
         thumbnail, images, rating, stock, brand)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (external_id) DO UPDATE SET
         title       = EXCLUDED.title,
         description = EXCLUDED.description,
         price       = EXCLUDED.price,
         category    = EXCLUDED.category,
         thumbnail   = EXCLUDED.thumbnail,
         images      = EXCLUDED.images,
         rating      = EXCLUDED.rating,
         stock       = EXCLUDED.stock,
         brand       = EXCLUDED.brand`,
      [
        p.external_id,
        p.title,
        p.description,
        p.price,
        p.category,
        p.thumbnail,
        p.images,
        p.rating,
        p.stock,
        p.brand,
      ]
    );
    inserted++;
  }

  return inserted;
};

/* ============================================================
   INVENTORY — RESERVE STOCK
============================================================ */

const reserveStock = async (
  userId: number,
  productId: number,
  quantity: number
): Promise<void> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const productRes = await client.query<{ stock: number }>(
      "SELECT stock FROM products WHERE id = $1 FOR UPDATE",
      [productId]
    );

    if (productRes.rows.length === 0) {
      throw new Error("Product not found");
    }

    const currentStock = productRes.rows[0].stock;

    if (currentStock < quantity) {
      throw new Error("Insufficient stock");
    }

    await client.query(
      "UPDATE products SET stock = stock - $1 WHERE id = $2",
      [quantity, productId]
    );

    await client.query(
      `INSERT INTO inventory_reservations
       (user_id, product_id, quantity, status, expires_at)
       VALUES ($1, $2, $3, 'reserved', NOW() + INTERVAL '15 minutes')`,
      [userId, productId, quantity]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/* ============================================================
   INVENTORY — RELEASE EXPIRED RESERVATIONS
============================================================ */

const releaseExpiredReservations = async (): Promise<number> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const expiredRes = await client.query<{
      id: number;
      product_id: number;
      quantity: number;
    }>(
      `SELECT id, product_id, quantity
       FROM inventory_reservations
       WHERE status = 'reserved'
       AND expires_at < NOW()
       FOR UPDATE`
    );

    let releasedCount = 0;

    for (const row of expiredRes.rows) {
      await client.query(
        "UPDATE products SET stock = stock + $1 WHERE id = $2",
        [row.quantity, row.product_id]
      );

      await client.query(
        "UPDATE inventory_reservations SET status = 'released' WHERE id = $1",
        [row.id]
      );

      releasedCount++;
    }

    await client.query("COMMIT");
    return releasedCount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/* ============================================================
   EXPORT
============================================================ */

export default {
  getAll,
  getByCategory,
  getById,
  search,
  getTopRated,
  bulkInsert,
  reserveStock,
  releaseExpiredReservations,
};
