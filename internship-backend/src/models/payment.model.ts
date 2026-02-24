import { pool } from "../config/db";

// Payment row shape from `payments` table
export interface PaymentRow {
  id:                        number;
  order_id:                  number;
  user_id:                   number;
  provider:                  string;
  amount:                    number;
  currency:                  string;
  status:                    string;
  stripe_payment_intent_id:  string | null;
  stripe_payment_method:     string | null;
  created_at:                Date;
  updated_at:                Date;
}

// Create payment record
const create = async (data: {
  orderId: number;
  userId: number;
  amount: number;
  currency: string;
  stripePaymentIntentId?: string | null;
  provider?: "stripe" | "cod";
  status?: string;
  stripePaymentMethod?: string | null;
}): Promise<PaymentRow> => {
  const provider = data.provider ?? "stripe";
  const status = data.status ?? "pending";

  const result = await pool.query<PaymentRow>(
    `INSERT INTO payments
       (order_id, user_id, provider, amount, currency,
        stripe_payment_intent_id, stripe_payment_method, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.orderId,
      data.userId,
      provider,
      data.amount,
      data.currency,
      data.stripePaymentIntentId ?? null,
      data.stripePaymentMethod ?? null,
      status,
    ]
  );

  return result.rows[0];
};

// Update payment by Stripe payment intent id
const updateStatus = async (
  paymentIntentId: string,
  status: string,
  paymentMethod?: string
): Promise<PaymentRow | null> => {
  const result = await pool.query<PaymentRow>(
    `UPDATE payments
     SET status = $1,
         stripe_payment_method = COALESCE($2, stripe_payment_method),
         updated_at = NOW()
     WHERE stripe_payment_intent_id = $3
     RETURNING *`,
    [status, paymentMethod, paymentIntentId]
  );

  return result.rows[0] || null;
};

// Get payment by Stripe payment intent id
const getByIntentId = async (
  paymentIntentId: string
): Promise<PaymentRow | null> => {
  const result = await pool.query<PaymentRow>(
    `SELECT * FROM payments
     WHERE stripe_payment_intent_id = $1`,
    [paymentIntentId]
  );

  return result.rows[0] || null;
};

// Get latest payment for DB order id
const getByOrderId = async (orderId: number): Promise<PaymentRow | null> => {
  const result = await pool.query<PaymentRow>(
    `SELECT * FROM payments
     WHERE order_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [orderId]
  );

  return result.rows[0] || null;
};

// Update latest payment for DB order id
const updateByOrderId = async (
  orderId: number,
  updates: {
    status?: string;
    provider?: string;
    stripePaymentMethod?: string | null;
    stripePaymentIntentId?: string | null;
  }
): Promise<PaymentRow | null> => {
  const result = await pool.query<PaymentRow>(
    `UPDATE payments
     SET status = COALESCE($2, status),
         provider = COALESCE($3, provider),
         stripe_payment_method = COALESCE($4, stripe_payment_method),
         stripe_payment_intent_id = COALESCE($5, stripe_payment_intent_id),
         updated_at = NOW()
     WHERE id = (
       SELECT id FROM payments
       WHERE order_id = $1
       ORDER BY created_at DESC
       LIMIT 1
     )
     RETURNING *`,
    [
      orderId,
      updates.status ?? null,
      updates.provider ?? null,
      updates.stripePaymentMethod ?? null,
      updates.stripePaymentIntentId ?? null,
    ]
  );

  return result.rows[0] || null;
};

export default {
  create,
  updateStatus,
  getByIntentId,
  getByOrderId,
  updateByOrderId,
};