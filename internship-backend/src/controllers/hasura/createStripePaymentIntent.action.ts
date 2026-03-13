import { Request, Response } from "express";
import { HasuraActionRequest } from "../../middleware/hasura";
import { createStripeIntentForOrder } from "../../services/hasura/payment.service";

export const handleCreateStripePaymentIntentAction = async (req: Request, res: Response) => {
  try {
    const actionReq = req as HasuraActionRequest;
    const session = actionReq.hasuraUser;
    if (!session) {
      res.status(400).json({ message: "A valid Hasura user session is required" });
      return;
    }

    const orderId = req.body?.input?.orderId as string | undefined;
    const amount = Number(req.body?.input?.amount ?? 0);
    const currency = String(req.body?.input?.currency ?? "inr").toLowerCase();

    const result = await createStripeIntentForOrder({
      orderId: orderId ?? "",
      userId: session.userId,
      amount,
      currency,
    });
    res.status(result.reused ? 200 : 201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action handling failed";
    console.error("handleCreateStripePaymentIntentAction error:", message);
    if (message === "orderId and amount required") {
      res.status(400).json({ message });
      return;
    }
    if (message === "Amount mismatch for order" || message === "Order total is invalid") {
      res.status(409).json({ message });
      return;
    }
    if (message === "Order not found") {
      res.status(404).json({ message });
      return;
    }
    if (message === "Stripe is not configured. Set a valid STRIPE_SECRET_KEY in backend .env") {
      res.status(400).json({ message });
      return;
    }
    if (message === "Payment already completed for this order") {
      res.status(409).json({ message });
      return;
    }
    res.status(500).json({ message: "Failed to create payment intent" });
  }
};
