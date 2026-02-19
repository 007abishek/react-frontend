import { pool } from "../config/db";

// ─── Types ────────────────────────────────────────────────────
export interface OrderRow {
  id:             number;
  user_id:        number;
  firebase_uid:   string;
  order_id:       string;
  status:         string;
  payment_method: string;
  subtotal:       number;
  total:          number;
  created_at:     Date;
  updated_at:     Date;
}

export interface OrderItemRow {
  id:         number;
  order_id:   number;
  product_id: number;
  title:      string;
  price:      number;
  thumbnail:  string;
  quantity:   number;
}

export interface ShippingAddressRow {
  id:            number;
  order_id:      number;
  full_name:     string;
  phone:         string;
  email:         string;
  address_line1: string;
  address_line2: string;
  city:          string;
  state:         string;
  pincode:       string;
}

export interface CreateOrderInput {
  userId:        number;
  firebaseUid:   string;
  orderId:       string;
  paymentMethod: string;
  items:         Array<{
    productId: number;
    title:     string;
    price:     number;
    thumbnail: string;
    quantity:  number;
  }>;
  address: {
    fullName:     string;
    phone:        string;
    email:        string;
    addressLine1: string;
    addressLine2: string;
    city:         string;
    state:        string;
    pincode:      string;
  };
  subtotal: number;
  total:    number;
}

// ─── Create order with items and address ──────────────────────
const create = async (input: CreateOrderInput): Promise<OrderRow> => {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    
    // 1. Insert order
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
    
    // 2. Insert order items (snapshot product data at order time)
    for (const item of input.items) {
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, title, price, thumbnail, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          order.id,
          item.productId,
          item.title,
          item.price,
          item.thumbnail,
          item.quantity,
        ]
      );
    }
    
    // 3. Insert shipping address
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

// ─── Get all orders for a user ────────────────────────────────
const getByUserId = async (userId: number): Promise<any[]> => {
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
       ) as items
     FROM orders o
     LEFT JOIN order_items oi ON o.id = oi.order_id
     WHERE o.user_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [userId]
  );
  
  return result.rows;
};

// ─── Get single order by order_id ─────────────────────────────
const getByOrderId = async (
  orderId: string,
  userId: number
): Promise<any | null> => {
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

// ─── Update order status ──────────────────────────────────────
const updateStatus = async (
  orderId: string,
  status: string
): Promise<void> => {
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
  updateStatus,
};