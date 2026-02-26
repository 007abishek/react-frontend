import db from "../config/knex";

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

  const rows = await db<PaymentRow>("payments")
    .insert({
      order_id: data.orderId,
      user_id: data.userId,
      provider,
      amount: data.amount,
      currency: data.currency,
      stripe_payment_intent_id: data.stripePaymentIntentId ?? null,
      stripe_payment_method: data.stripePaymentMethod ?? null,
      status,
    })
    .returning("*");

  return rows[0];
};

// Update payment by Stripe payment intent id
const updateStatus = async (
  paymentIntentId: string,
  status: string,
  paymentMethod?: string
): Promise<PaymentRow | null> => {
  const patch: Record<string, unknown> = {
    status,
    updated_at: db.fn.now(),
  };
  if (paymentMethod !== undefined) {
    patch.stripe_payment_method = paymentMethod;
  }

  const rows = await db<PaymentRow>("payments")
    .where({ stripe_payment_intent_id: paymentIntentId })
    .update(patch)
    .returning("*");

  return rows[0] ?? null;
};

// Get payment by Stripe payment intent id
const getByIntentId = async (
  paymentIntentId: string
): Promise<PaymentRow | null> => {
  const row = await db<PaymentRow>("payments")
    .select("*")
    .where({ stripe_payment_intent_id: paymentIntentId })
    .first();

  return row ?? null;
};

// Get latest payment for DB order id
const getByOrderId = async (orderId: number): Promise<PaymentRow | null> => {
  const row = await db<PaymentRow>("payments")
    .select("*")
    .where({ order_id: orderId })
    .orderBy("created_at", "desc")
    .first();

  return row ?? null;
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
  const latest = await db("payments")
    .select("id")
    .where({ order_id: orderId })
    .orderBy("created_at", "desc")
    .first();

  if (!latest) return null;

  const patch: Record<string, unknown> = {
    updated_at: db.fn.now(),
  };

  if (updates.status != null) patch.status = updates.status;
  if (updates.provider != null) patch.provider = updates.provider;
  if (updates.stripePaymentMethod != null) {
    patch.stripe_payment_method = updates.stripePaymentMethod;
  }
  if (updates.stripePaymentIntentId != null) {
    patch.stripe_payment_intent_id = updates.stripePaymentIntentId;
  }

  const rows = await db<PaymentRow>("payments")
    .where({ id: latest.id })
    .update(patch)
    .returning("*");

  return rows[0] ?? null;
};

export default {
  create,
  updateStatus,
  getByIntentId,
  getByOrderId,
  updateByOrderId,
};
