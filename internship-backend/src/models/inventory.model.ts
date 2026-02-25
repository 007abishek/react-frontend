import { pool } from "../config/db";

// ─── Types ────────────────────────────────────────────────────
export interface ReservationRow {
  id:         number;
  user_id:    number;
  product_id: number;
  quantity:   number;
  status:     string;
  expires_at: Date;
  created_at: Date;
}

// ─── Check if product has enough available stock ──────────────
const checkAvailability = async (
  productId: number,
  requestedQty: number
): Promise<{ available: boolean; currentStock: number; reserved: number }> => {
  const client = await pool.connect();
  
  try {
    // Get current stock
    const stockResult = await client.query(
      `SELECT stock FROM products WHERE id = $1`,
      [productId]
    );
    
    if (stockResult.rows.length === 0) {
      return { available: false, currentStock: 0, reserved: 0 };
    }
    
    const currentStock = stockResult.rows[0].stock;
    
    // Get total pending reservations
    const reservedResult = await client.query(
      `SELECT COALESCE(SUM(quantity), 0) as reserved
       FROM inventory_reservations
       WHERE product_id = $1 AND status = 'pending'`,
      [productId]
    );
    
    const reserved = parseInt(reservedResult.rows[0].reserved);
    const availableStock = currentStock - reserved;
    
    return {
      available: availableStock >= requestedQty,
      currentStock,
      reserved,
    };
  } finally {
    client.release();
  }
};

// ─── Reserve inventory for checkout ───────────────────────────
// Creates pending reservations with 5-minute expiry
const reserve = async (
  userId: number,
  items: { productId: number; quantity: number }[]
): Promise<{ success: boolean; reservations?: ReservationRow[]; error?: string }> => {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const requestedByProduct = new Map<number, number>();

    for (const item of items) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) ?? 0) + item.quantity
      );
    }

    const availabilityResult = await client.query<{
      product_id: number;
      current_stock: number;
      reserved: number;
    }>(
      `WITH locked_products AS (
         SELECT id, stock
         FROM products
         WHERE id = ANY($1)
         FOR UPDATE
       ),
       reserved AS (
         SELECT
           product_id,
           SUM(quantity)::int AS reserved
         FROM inventory_reservations
         WHERE status = 'pending' AND product_id = ANY($1)
         GROUP BY product_id
       )
       SELECT
         lp.id AS product_id,
         lp.stock AS current_stock,
         COALESCE(r.reserved, 0)::int AS reserved
       FROM locked_products lp
       LEFT JOIN reserved r ON r.product_id = lp.id`,
      [productIds]
    );

    if (availabilityResult.rows.length !== productIds.length) {
      await client.query("ROLLBACK");
      return { success: false, error: "One or more products do not exist" };
    }

    const availabilityMap = new Map(
      availabilityResult.rows.map((row) => [row.product_id, row])
    );

    for (const [productId, requestedQty] of requestedByProduct) {
      const availability = availabilityMap.get(productId);
      if (!availability) {
        await client.query("ROLLBACK");
        return { success: false, error: `Product ${productId} does not exist` };
      }

      const availableQty = availability.current_stock - availability.reserved;
      if (availableQty < requestedQty) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: `Product ${productId} - only ${availableQty} available, requested ${requestedQty}`,
        };
      }
    }

    // Create reservations (5 min TTL) in one query
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const insertProductIds = items.map((item) => item.productId);
    const insertQuantities = items.map((item) => item.quantity);

    const reservationInsertResult = await client.query<ReservationRow>(
      `INSERT INTO inventory_reservations
         (user_id, product_id, quantity, status, expires_at)
       SELECT
         $1,
         t.product_id,
         t.quantity,
         'pending',
         $4
       FROM unnest($2::int[], $3::int[]) AS t(product_id, quantity)
       RETURNING *`,
      [userId, insertProductIds, insertQuantities, expiresAt]
    );
    
    await client.query("COMMIT");
    
    return { success: true, reservations: reservationInsertResult.rows };
    
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─── Confirm reservation (after payment success) ──────────────
// Reduces actual stock and marks reservation as confirmed
const confirm = async (
  reservationIds: number[]
): Promise<{ success: boolean; error?: string }> => {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Lock and read all pending reservations
    const reservations = await client.query<ReservationRow>(
      `SELECT * FROM inventory_reservations
       WHERE id = ANY($1) AND status = 'pending'
       FOR UPDATE`,
      [reservationIds]
    );
    
    if (reservations.rows.length !== reservationIds.length) {
      await client.query("ROLLBACK");
      return { success: false, error: "Some reservations not found or already processed" };
    }
    
    const requiredByProduct = new Map<number, number>();
    for (const reservation of reservations.rows) {
      requiredByProduct.set(
        reservation.product_id,
        (requiredByProduct.get(reservation.product_id) ?? 0) + reservation.quantity
      );
    }

    const requiredProductIds = Array.from(requiredByProduct.keys());
    const requiredQuantities = requiredProductIds.map(
      (productId) => requiredByProduct.get(productId) ?? 0
    );

    const stockUpdateResult = await client.query(
      `UPDATE products p
       SET stock = p.stock - req.required_qty
       FROM (
         SELECT * FROM unnest($1::int[], $2::int[]) AS t(product_id, required_qty)
       ) req
       WHERE p.id = req.product_id
         AND p.stock >= req.required_qty
       RETURNING p.id`,
      [requiredProductIds, requiredQuantities]
    );

    if ((stockUpdateResult.rowCount ?? 0) !== requiredProductIds.length) {
      await client.query("ROLLBACK");
      return {
        success: false,
        error: "Insufficient stock for one or more products",
      };
    }
    
    // Mark reservations as confirmed
    await client.query(
      `UPDATE inventory_reservations
       SET status = 'confirmed'
       WHERE id = ANY($1)`,
      [reservationIds]
    );
    
    await client.query("COMMIT");
    return { success: true };
    
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

// ─── Release reservation (timeout or cancel) ──────────────────
// Just marks as expired/cancelled — stock was never reduced
const release = async (
  reservationIds: number[],
  reason: "expired" | "cancelled" = "cancelled"
): Promise<{ success: boolean }> => {
  await pool.query(
    `UPDATE inventory_reservations
     SET status = $1
     WHERE id = ANY($2) AND status = 'pending'`,
    [reason, reservationIds]
  );
  
  return { success: true };
};

// ─── Get user's pending reservations ──────────────────────────
const getPendingByUser = async (userId: number): Promise<ReservationRow[]> => {
  const result = await pool.query<ReservationRow>(
    `SELECT r.*, p.title, p.price, p.thumbnail
     FROM inventory_reservations r
     JOIN products p ON r.product_id = p.id
     WHERE r.user_id = $1 AND r.status = 'pending'
     ORDER BY r.created_at DESC`,
    [userId]
  );
  
  return result.rows;
};

// ─── Cleanup expired reservations (cron job) ──────────────────
const releaseExpired = async (): Promise<number> => {
  const result = await pool.query(
    `UPDATE inventory_reservations
     SET status = 'expired'
     WHERE status = 'pending'
       AND expires_at < NOW()
     RETURNING id`
  );
  
  return result.rows.length;
};
   // get reservation by Id

const getByIntentId = async (id: string): Promise<ReservationRow | null> => {
  const result = await pool.query<ReservationRow>(
    `SELECT * FROM inventory_reservations WHERE id = $1`,
    [parseInt(id, 10)]
  );
  
  return result.rows[0] || null;
};





export default {
  checkAvailability,
  reserve,
  confirm,
  release,
  getPendingByUser,
  releaseExpired,
  getByIntentId,
};


