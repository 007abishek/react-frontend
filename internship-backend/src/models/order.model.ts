import { pool } from "../config/db";
import InventoryModel from "./inventory.model";

interface CreateOrderResult {
  success: boolean;
  orderId?: number;
  error?: string;
}

const createOrder = async (userId: number): Promise<CreateOrderResult> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Get user's pending reservations
    const reservationsRes = await client.query(
      `SELECT r.*, p.price
       FROM inventory_reservations r
       JOIN products p ON r.product_id = p.id
       WHERE r.user_id = $1
         AND r.status = 'pending'
       FOR UPDATE`,
      [userId]
    );

    if (reservationsRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "No pending reservations found" };
    }

    const reservations = reservationsRes.rows;

    // 2️⃣ Confirm inventory (deduct stock safely)
    const reservationIds = reservations.map(r => r.id);
    const confirmResult = await InventoryModel.confirm(reservationIds);

    if (!confirmResult.success) {
      await client.query("ROLLBACK");
      return { success: false, error: confirmResult.error };
    }

    // 3️⃣ Calculate total amount
    const totalAmount = reservations.reduce((sum, r) => {
      return sum + Number(r.price) * r.quantity;
    }, 0);

    // 4️⃣ Create order
    const orderRes = await client.query(
      `INSERT INTO orders (user_id, status, total_amount)
       VALUES ($1, 'pending', $2)
       RETURNING id`,
      [userId, totalAmount]
    );

    const orderId = orderRes.rows[0].id;

    // 5️⃣ Insert order_items
    for (const r of reservations) {
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, r.product_id, r.quantity, r.price]
      );
    }

    await client.query("COMMIT");

    return { success: true, orderId };

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export default {
  createOrder,
};
