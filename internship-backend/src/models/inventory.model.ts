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
// Creates pending reservations with 1-minute (test) expiry
const reserve = async (
  userId: number,
  items: { productId: number; quantity: number }[]
): Promise<{ success: boolean; reservations?: ReservationRow[]; error?: string }> => {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // Check availability for all items
    for (const item of items) {
      const check = await checkAvailability(item.productId, item.quantity);
      
      if (!check.available) {
        await client.query("ROLLBACK");
        return {
          success: false,
          error: `Product ${item.productId} - only ${check.currentStock - check.reserved} available, requested ${item.quantity}`,
        };
      }
    }
    
    // Create reservations (1 min TTL (test))
    const reservations: ReservationRow[] = [];
    const expiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
    
    for (const item of items) {
      const result = await client.query<ReservationRow>(
        `INSERT INTO inventory_reservations
           (user_id, product_id, quantity, status, expires_at)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING *`,
        [userId, item.productId, item.quantity, expiresAt]
      );
      
      reservations.push(result.rows[0]);
    }
    
    await client.query("COMMIT");
    
    return { success: true, reservations };
    
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
    
    // Get all reservations
    const reservations = await client.query<ReservationRow>(
      `SELECT * FROM inventory_reservations
       WHERE id = ANY($1) AND status = 'pending'`,
      [reservationIds]
    );
    
    if (reservations.rows.length !== reservationIds.length) {
      await client.query("ROLLBACK");
      return { success: false, error: "Some reservations not found or already processed" };
    }
    
    // Reduce stock for each product
    for (const reservation of reservations.rows) {
      const updateRes= await client.query(
        `UPDATE products
         SET stock = stock - $1
         WHERE id = $2 AND stock >= $1`,
        [reservation.quantity, reservation.product_id]
      );

      if(updateRes.rowCount ===0){
        await client.query("ROLLBACK");
        return{
            success: false,
            error: `Insufficient stock for product ${reservation.product_id}`,
        };
      }
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
    [parseInt(id)]
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

