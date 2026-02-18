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

    // Insert all items
    for (const item of items) {
      await client.query(
        `INSERT INTO cart_items
           (user_id, product_id, title, price,
            thumbnail, images, quantity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          item.product_id,
          item.title,
          item.price,
          item.thumbnail,
          item.images,
          item.quantity,
        ]
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