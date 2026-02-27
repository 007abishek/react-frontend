import { Request, Response } from "express";
import { StripeWebhookRequest } from "../middleware/stripeWebhook";
import { processStripeWebhookEvent } from "../services/payments/webhook.service";

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const webhookReq = req as StripeWebhookRequest;
  const event = webhookReq.stripeEvent;
  if (!event) {
    res.status(400).json({ message: "Stripe event missing after signature verification" });
    return;
  }

  try {
    await processStripeWebhookEvent(event);
    res.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    console.error("Webhook handler error:", message);
    res.status(500).json({ message: "Webhook handler failed" });
  }
};
