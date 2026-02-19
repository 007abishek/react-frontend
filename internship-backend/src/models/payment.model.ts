import { pool } from "../config/db";

// ─── Types ────────────────────────────────────────────────────
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

// ─── Create payment record ────────────────────────────────────
const create = async (data: {
  orderId:               number;
  userId:                number;
  amount:                number;
  currency:              string;
  stripePaymentIntentId: string;
}): Promise<PaymentRow> => {
  const result = await pool.query<PaymentRow>(
    `INSERT INTO payments
       (order_id, user_id, provider, amount, currency, 
        stripe_payment_intent_id, status)
     VALUES ($1, $2, 'stripe', $3, $4, $5, 'pending')
     RETURNING *`,
    [
      data.orderId,
      data.userId,
      data.amount,
      data.currency,
      data.stripePaymentIntentId,
    ]
  );
  
  return result.rows[0];
};

// ─── Update payment status ────────────────────────────────────
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

// ─── Get payment by intent ID ─────────────────────────────────
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

// ─── Get payment by order ID ──────────────────────────────────
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

export default {
  create,
  updateStatus,
  getByIntentId,
  getByOrderId,
};