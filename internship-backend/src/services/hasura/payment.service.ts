import { stripe } from "../../config/stripe";
import OrderModel from "../../models/order.model";
import PaymentModel from "../../models/payment.model";

export async function getPaymentStatusForOrder(orderId: string, userId: number): Promise<{
  status: string;
  amount: number;
  currency: string;
  provider: string;
}> {
  const order = await OrderModel.getByOrderId(orderId, userId);
  if (!order) {
    throw new Error("Order not found");
  }

  const payment = await PaymentModel.getByOrderId(order.id);
  if (!payment) {
    throw new Error("Payment not found");
  }

  return {
    status: payment.status,
    amount: Number(payment.amount),
    currency: payment.currency,
    provider: payment.provider,
  };
}

export async function createStripeIntentForOrder(input: {
  orderId: string;
  userId: number;
  amount: number;
  currency?: string;
}): Promise<{ clientSecret: string | null; paymentIntentId: string; reused: boolean }> {
  const currency = String(input.currency ?? "inr").toLowerCase();
  const amount = Number(input.amount);

  if (!input.orderId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("orderId and amount required");
  }

  const order = await OrderModel.getByOrderId(input.orderId, input.userId);
  if (!order) {
    throw new Error("Order not found");
  }

  const existingPayment = await PaymentModel.getByOrderId(order.id);
  if (existingPayment?.stripe_payment_intent_id) {
    try {
      const existingIntent = await stripe.paymentIntents.retrieve(existingPayment.stripe_payment_intent_id);

      if (existingIntent.status === "succeeded") {
        throw new Error("Payment already completed for this order");
      }

      if (existingIntent.status !== "canceled" && existingIntent.client_secret) {
        return {
          clientSecret: existingIntent.client_secret,
          paymentIntentId: existingIntent.id,
          reused: true,
        };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      if (message === "Payment already completed for this order") throw err;
      console.warn("createStripeIntentForOrder retrieve failed, creating new intent:", message);
    }
  }

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        orderId: order.order_id,
        userId: String(input.userId),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    },
    {
      idempotencyKey: `order:${order.order_id}:amount:${Math.round(amount * 100)}:currency:${currency}`,
    }
  );

  await PaymentModel.create({
    orderId: order.id,
    userId: input.userId,
    amount,
    currency,
    stripePaymentIntentId: paymentIntent.id,
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    reused: false,
  };
}
