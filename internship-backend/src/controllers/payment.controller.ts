import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { stripe, STRIPE_WEBHOOK_SECRET } from "../config/stripe";
import PaymentModel from "../models/payment.model";
import OrderModel from "../models/order.model";
import InventoryModel from "../models/inventory.model";
import { getWorkflowHandle } from "../temporal/client";
// ─── POST /payments/stripe/intent ─────────────────────────────
// Create Stripe PaymentIntent for checkout
// ─────────────────────────────────────────────────────────────
export const createPaymentIntent = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const { orderId, amount, currency = "inr" } = req.body;

    const numericAmount = Number(amount);
    if (!orderId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ message: "orderId and amount required" });
      return;
    }

    // Get order from database
    const order = await OrderModel.getByOrderId(orderId, userId);

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    // Idempotency: reuse latest PaymentIntent for this order when possible
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

        // Reuse intent unless it was canceled.
        if (existingIntent.status !== "canceled" && existingIntent.client_secret) {
          res.status(200).json({
            clientSecret: existingIntent.client_secret,
            paymentIntentId: existingIntent.id,
            reused: true,
          });
          return;
        }
      } catch (retrieveErr: unknown) {
        const retrieveMessage =
          retrieveErr instanceof Error ? retrieveErr.message : "unknown error";
        console.warn("PaymentIntent retrieve failed, creating new one:", retrieveMessage);
      }
    }

    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numericAmount * 100), // Stripe uses smallest currency unit (paise)
      currency: currency.toLowerCase(),
      metadata: {
        orderId: order.order_id,
        userId: userId.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    }, {
      // Prevent duplicate intent creation for repeated requests with same order/amount.
      idempotencyKey: `order:${order.order_id}:amount:${Math.round(
        numericAmount * 100
      )}:currency:${currency.toLowerCase()}`,
    });

    // Save payment record in database
    await PaymentModel.create({
      orderId: order.id,
      userId,
      amount: numericAmount,
      currency,
      stripePaymentIntentId: paymentIntent.id,
    });

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
    console.log("Creating PaymentIntent...");
    console.log("Amount:",amount);
    
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create payment intent";
    console.error("createPaymentIntent error:", message);
    res.status(500).json({ message });
  }
};

// ─── POST /payments/stripe/webhook ────────────────────────────
// Handle Stripe webhook events
// ─────────────────────────────────────────────────────────────
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig= req.headers["stripe-signature"];
  

  if (!sig || Array.isArray(sig)) {
    res.status(400).json({ message: "Missing stripe-signature header" });
    return;
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).json({ message: `Webhook Error: ${err.message}` });
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
  const paymentIntent = event.data.object;
  
  // Update payment status
  const payment = await PaymentModel.updateStatus(
    paymentIntent.id,
    "succeeded",
    paymentIntent.payment_method as string
  );

  if (payment) {
    const orderId = paymentIntent.metadata.orderId;
    
    // ──────────────────────────────────────────────────────────
    // SIGNAL TEMPORAL WORKFLOW
    // ──────────────────────────────────────────────────────────
    try {
      const { getWorkflowHandle } = await import("../temporal/client");
      const workflowHandle = await getWorkflowHandle(`order-${orderId}`);
      await workflowHandle.signal('paymentCompleted', true);
      console.log('✅ Workflow signaled: paymentCompleted');
    } catch (err: any) {
      console.error('⚠️ Failed to signal workflow:', err.message);
      
      // Fallback: manually update order status
      await OrderModel.updateStatus(orderId, "confirmed");
    }
  }

  console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
  break;
}

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        
        await PaymentModel.updateStatus(paymentIntent.id, "failed");
        
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;
        
        await PaymentModel.updateStatus(paymentIntent.id, "cancelled");
        
        // Release inventory reservations
        const payment = await PaymentModel.getByIntentId(paymentIntent.id);
        if (payment) {
          const order = await OrderModel.getByOrderId(
            paymentIntent.metadata.orderId,
            payment.user_id
          );
          
          if (order) {
            await OrderModel.updateStatus(order.order_id, "cancelled");
            
            // Release reservations
            const reservations = await InventoryModel.getPendingByUser(
              payment.user_id
            );
            
            if (reservations.length > 0) {
              const reservationIds = reservations.map(r => r.id);
              await InventoryModel.release(reservationIds, "cancelled");
            }
          }
        }
        
        console.log(`⚠️ Payment cancelled: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (err: any) {
    console.error("Webhook handler error:", err.message);
    res.status(500).json({ message: "Webhook handler failed" });
  }
};

// ─── GET /payments/:orderId ───────────────────────────────────
// Get payment status for an order
// ─────────────────────────────────────────────────────────────
export const getPaymentStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const orderIdParam=req.params.orderId;

    if(!orderIdParam || Array.isArray(orderIdParam)){
        return res.status(400).json({message: "Invalid orderId"});
    }
    const orderId=orderIdParam;

    const order = await OrderModel.getByOrderId(orderId, userId);

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const payment = await PaymentModel.getByOrderId(order.id);

    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    res.json({
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        createdAt: payment.created_at,
      },
    });

  } catch (err: any) {
    console.error("getPaymentStatus error:", err.message);
    res.status(500).json({ message: "Failed to fetch payment status" });
  }
};
