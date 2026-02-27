import InventoryModel from "../../models/inventory.model";
import OrderModel from "../../models/order.model";
import PaymentModel from "../../models/payment.model";
import type Stripe from "stripe";

export async function processStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const payment = await PaymentModel.updateStatus(
        paymentIntent.id,
        "succeeded",
        typeof paymentIntent.payment_method === "string" ? paymentIntent.payment_method : undefined
      );

      if (payment) {
        const orderId = paymentIntent.metadata.orderId;
        try {
          const { getWorkflowHandle } = await import("../../temporal/client");
          const workflowHandle = await getWorkflowHandle(`order-${orderId}`);
          await workflowHandle.signal("paymentCompleted", true);
          console.log("Workflow signaled: paymentCompleted");
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Failed to signal workflow";
          console.error("Failed to signal workflow:", message);
        }
      }

      console.log(`Payment succeeded: ${paymentIntent.id}`);
      return;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await PaymentModel.updateStatus(paymentIntent.id, "failed");
      console.log(`Payment failed: ${paymentIntent.id}`);
      return;
    }

    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

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
      return;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
      return;
  }
}
