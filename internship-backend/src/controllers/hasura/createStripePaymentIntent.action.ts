import { Request, Response } from "express";
import { stripe } from "../../config/stripe";
import OrderModel from "../../models/order.model";
import PaymentModel from "../../models/payment.model";
import { getHasuraSessionUser, requireHasuraActionSecret } from "./helpers";

export const handleCreateStripePaymentIntentAction = async (req: Request, res: Response) => {
  try {
    if (!requireHasuraActionSecret(req)) {
      res.status(401).json({ message: "Unauthorized Hasura action" });
      return;
    }

    const session = getHasuraSessionUser(req);
    if (!session) {
      res.status(400).json({ message: "A valid Hasura user session is required" });
      return;
    }

    const orderId = req.body?.input?.orderId as string | undefined;
    const amount = Number(req.body?.input?.amount ?? 0);
    const currency = String(req.body?.input?.currency ?? "inr").toLowerCase();

    if (!orderId || !Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ message: "orderId and amount required" });
      return;
    }

    const order = await OrderModel.getByOrderId(orderId, session.userId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const existingPayment = await PaymentModel.getByOrderId(order.id);
    if (existingPayment?.stripe_payment_intent_id) {
      try {
        const existingIntent = await stripe.paymentIntents.retrieve(
          existingPayment.stripe_payment_intent_id
        );

        if (existingIntent.status === "succeeded") {
          res.status(409).json({
            message: "Payment already completed for this order",
            paymentIntentId: existingIntent.id,
          });
          return;
        }

        if (existingIntent.status !== "canceled" && existingIntent.client_secret) {
          res.json({
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            reused: true,
          });
          return;
        }
      } catch (retrieveErr: unknown) {
        const retrieveMessage =
          retrieveErr instanceof Error ? retrieveErr.message : "unknown error";
        console.warn(
          "handleCreateStripePaymentIntentAction retrieve failed, creating new intent:",
          retrieveMessage
        );
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100),
        currency,
        metadata: {
          orderId: order.order_id,
          userId: String(session.userId),
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
      userId: session.userId,
      amount,
      currency,
      stripePaymentIntentId: paymentIntent.id,
    });

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      reused: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action handling failed";
    console.error("handleCreateStripePaymentIntentAction error:", message);
    res.status(500).json({ message: "Failed to create payment intent" });
  }
};
