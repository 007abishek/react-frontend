import { Request, Response } from "express";
import { stripe, STRIPE_WEBHOOK_SECRET } from "../config/stripe";
import InventoryModel from "../models/inventory.model";
import OrderModel from "../models/order.model";
import PaymentModel from "../models/payment.model";

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  if (!sig || Array.isArray(sig)) {
    res.status(400).json({ message: "Missing stripe-signature header" });
    return;
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook signature verification failed:", message);
    res.status(400).json({ message: `Webhook Error: ${message}` });
    return;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        const payment = await PaymentModel.updateStatus(
          paymentIntent.id,
          "succeeded",
          paymentIntent.payment_method as string
        );

        if (payment) {
          const orderId = paymentIntent.metadata.orderId;
          try {
            const { getWorkflowHandle } = await import("../temporal/client");
            const workflowHandle = await getWorkflowHandle(`order-${orderId}`);
            await workflowHandle.signal("paymentCompleted", true);
            console.log("Workflow signaled: paymentCompleted");
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to signal workflow";
            console.error("Failed to signal workflow:", message);
          }
        }

        console.log(`Payment succeeded: ${paymentIntent.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        await PaymentModel.updateStatus(paymentIntent.id, "failed");
        console.log(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;

        await PaymentModel.updateStatus(paymentIntent.id, "cancelled");

        const payment = await PaymentModel.getByIntentId(paymentIntent.id);
        if (payment) {
          const order = await OrderModel.getByOrderId(paymentIntent.metadata.orderId, payment.user_id);

          if (order) {
            await OrderModel.updateStatus(order.order_id, "cancelled");

            const reservations = await InventoryModel.getPendingByUser(payment.user_id);
            if (reservations.length > 0) {
              const reservationIds = reservations.map((r) => r.id);
              await InventoryModel.release(reservationIds, "cancelled");
            }
          }
        }

        console.log(`Payment cancelled: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("Webhook handler error:", message);
    res.status(500).json({ message: "Webhook handler failed" });
  }
};
