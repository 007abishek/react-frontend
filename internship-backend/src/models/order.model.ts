import { pool } from "../config/db";

export interface OrderRow {
  id: number;
  user_id: number;
  firebase_uid: string;
  order_id: string;
  status: string;
  payment_method: string;
  subtotal: number;
  total: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderInput {
  userId: number;
  firebaseUid: string;
  orderId: string;
  paymentMethod: string;
  items: Array<{
    productId: number;
    title: string;
    price: number;
    thumbnail: string;
    quantity: number;
  }>;
  address: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
  };
  subtotal: number;
  total: number;
}

const create = async (input: CreateOrderInput): Promise<OrderRow> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query<OrderRow>(
      `INSERT INTO orders
         (user_id, firebase_uid, order_id, status, payment_method, subtotal, total)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING *`,
      [
        input.userId,
        input.firebaseUid,
        input.orderId,
        input.paymentMethod,
        input.subtotal,
        input.total,
      ]
    );

    const order = orderResult.rows[0];

    const productIds = input.items.map((item) => item.productId);
    const titles = input.items.map((item) => item.title);
    const prices = input.items.map((item) => item.price);
    const thumbnails = input.items.map((item) => item.thumbnail);
    const quantities = input.items.map((item) => item.quantity);

    await client.query(
      `INSERT INTO order_items
         (order_id, product_id, title, price, thumbnail, quantity)
       SELECT
         $1,
         t.product_id,
         t.title,
         t.price,
         t.thumbnail,
         t.quantity
       FROM unnest(
         $2::int[],
         $3::text[],
         $4::numeric[],
         $5::text[],
         $6::int[]
       ) AS t(product_id, title, price, thumbnail, quantity)`,
      [order.id, productIds, titles, prices, thumbnails, quantities]
    );

    await client.query(
      `INSERT INTO shipping_addresses
         (order_id, full_name, phone, email, address_line1,
          address_line2, city, state, pincode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        order.id,
        input.address.fullName,
        input.address.phone,
        input.address.email,
        input.address.addressLine1,
        input.address.addressLine2,
        input.address.city,
        input.address.state,
        input.address.pincode,
      ]
    );

    await client.query("COMMIT");
    return order;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const getByUserId = async (userId: number): Promise<any[]> => {
  const result = await pool.query(
    `SELECT
       o.*,
       lp.status AS payment_status,
       COALESCE(json_agg(
         json_build_object(
           'id', oi.id,
           'productId', oi.product_id,
           'title', oi.title,
           'price', oi.price,
           'thumbnail', oi.thumbnail,
           'quantity', oi.quantity
         )
       ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json) as items
     FROM orders o
     LEFT JOIN LATERAL (
       SELECT p.status
       FROM payments p
       WHERE p.order_id = o.id
       ORDER BY p.created_at DESC
       LIMIT 1
     ) lp ON TRUE
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = $1
     GROUP BY o.id, lp.status
     ORDER BY o.created_at DESC`,
    [userId]
  );

  return result.rows;
};

const getByOrderId = async (orderId: string, userId: number): Promise<any | null> => {
  const result = await pool.query(
    `SELECT
       o.*,
       json_agg(
         json_build_object(
           'id', oi.id,
           'productId', oi.product_id,
           'title', oi.title,
           'price', oi.price,
           'thumbnail', oi.thumbnail,
           'quantity', oi.quantity
         )
       ) as items,
       json_build_object(
         'fullName', sa.full_name,
         'phone', sa.phone,
         'email', sa.email,
         'addressLine1', sa.address_line1,
         'addressLine2', sa.address_line2,
         'city', sa.city,
         'state', sa.state,
         'pincode', sa.pincode
       ) as address
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN shipping_addresses sa ON o.id = sa.order_id
     WHERE o.order_id = $1 AND o.user_id = $2
     GROUP BY o.id, sa.id`,
    [orderId, userId]
  );

  return result.rows[0] || null;
};

const getByOrderIdAny = async (orderId: string): Promise<any | null> => {
  const result = await pool.query(
    `SELECT
       o.*,
       sa.email as shipping_email
     FROM orders o
     LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
     WHERE o.order_id = $1
     LIMIT 1`,
    [orderId]
  );

  return result.rows[0] || null;
};

const getWorkflowDataByOrderId = async (orderId: string): Promise<any | null> => {
  const orderResult = await pool.query(
    `SELECT
       o.id,
       o.user_id,
       o.firebase_uid,
       o.order_id,
       o.created_at,
       o.payment_method,
       o.subtotal,
       o.total,
       sa.full_name,
       sa.phone,
       sa.email,
       sa.address_line1,
       sa.address_line2,
       sa.city,
       sa.state,
       sa.pincode
     FROM orders o
     LEFT JOIN shipping_addresses sa ON sa.order_id = o.id
     WHERE o.order_id = $1
     LIMIT 1`,
    [orderId]
  );

  const order = orderResult.rows[0];
  if (!order) return null;

  const itemsResult = await pool.query(
    `SELECT
       product_id,
       title,
       price,
       thumbnail,
       quantity
     FROM order_items
     WHERE order_id = $1
     ORDER BY id ASC`,
    [order.id]
  );

  return {
    ...order,
    items: itemsResult.rows,
  };
};

const updateStatus = async (orderId: string, status: string): Promise<void> => {
  await pool.query(
    `UPDATE orders
     SET status = $1, updated_at = NOW()
     WHERE order_id = $2`,
    [status, orderId]
  );
};

export default {
  create,
  getByUserId,
  getByOrderId,
  getByOrderIdAny,
  getWorkflowDataByOrderId,
  updateStatus,
};
