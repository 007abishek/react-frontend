import { pool } from "../config/db";

// ─── Types ────────────────────────────────────────────────────
export interface CartItemRow {
  id:         number;
  user_id:    number;
  product_id: number;
  title:      string;
  price:      number;
  thumbnail:  string;
  images:     string[];
  quantity:   number;
}

// ─── Get all cart items for a user ───────────────────────────
const getByUserId = async (userId: number): Promise<CartItemRow[]> => {
  const res = await pool.query<CartItemRow>(
    `SELECT id, user_id, product_id, title, price,
            thumbnail, images, quantity
     FROM cart_items
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId]
  );
  return res.rows;
};

// ─── Add item or increase quantity if exists ──────────────────
const upsert = async (
  userId:    number,
  productId: number,
  title:     string,
  price:     number,
  thumbnail: string,
  images:    string[],
  quantity:  number
): Promise<CartItemRow> => {
  const res = await pool.query<CartItemRow>(
    `INSERT INTO cart_items
       (user_id, product_id, title, price, thumbnail, images, quantity)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET
       quantity   = cart_items.quantity + EXCLUDED.quantity,
       updated_at = NOW()
     RETURNING *`,
    [userId, productId, title, price, thumbnail, images, quantity]
  );
  return res.rows[0];
};

// ─── Update quantity directly ─────────────────────────────────
const updateQuantity = async (
  id:       number,
  userId:   number,
  quantity: number
): Promise<CartItemRow | null> => {
  const res = await pool.query<CartItemRow>(
    `UPDATE cart_items
     SET quantity = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [quantity, id, userId]
  );
  return res.rows[0] || null;
};

// ─── Remove single item ───────────────────────────────────────
const removeItem = async (
  id:     number,
  userId: number
): Promise<boolean> => {
  const res = await pool.query(
    `DELETE FROM cart_items
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (res.rowCount ?? 0) > 0;
};

// ─── Clear entire cart ────────────────────────────────────────
const clearCart = async (userId: number): Promise<void> => {
  await pool.query(
    `DELETE FROM cart_items WHERE user_id = $1`,
    [userId]
  );
};

// ─── Sync entire cart (used on login) ────────────────────────
// Replaces all items for a user in one transaction
const syncCart = async (
  userId: number,
  items:  Omit<CartItemRow, "id" | "user_id">[]
): Promise<CartItemRow[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clear existing cart
    await client.query(
      "DELETE FROM cart_items WHERE user_id = $1",
      [userId]
    );

    // Insert all items in one query
    if (items.length > 0) {
      const productIds = items.map((item) => item.product_id);
      const titles = items.map((item) => item.title);
      const prices = items.map((item) => item.price);
      const thumbnails = items.map((item) => item.thumbnail);
      const images = items.map((item) => item.images);
      const quantities = items.map((item) => item.quantity);

      await client.query(
        `INSERT INTO cart_items
           (user_id, product_id, title, price, thumbnail, images, quantity)
         SELECT
           $1,
           t.product_id,
           t.title,
           t.price,
           t.thumbnail,
           t.images,
           t.quantity
         FROM unnest(
           $2::int[],
           $3::text[],
           $4::numeric[],
           $5::text[],
           $6::text[][],
           $7::int[]
         ) AS t(product_id, title, price, thumbnail, images, quantity)`,
        [userId, productIds, titles, prices, thumbnails, images, quantities]
      );
    }

    await client.query("COMMIT");

    // Return synced cart
    const res = await client.query<CartItemRow>(
      `SELECT * FROM cart_items
       WHERE user_id = $1
       ORDER BY created_at ASC`,
      [userId]
    );
    return res.rows;

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export default {
  getByUserId,
  upsert,
  updateQuantity,
  removeItem,
  clearCart,
  syncCart,
};
