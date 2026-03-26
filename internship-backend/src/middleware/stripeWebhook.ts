import { NextFunction, Request, Response } from "express";
import type Stripe from "stripe";
import { stripe, STRIPE_WEBHOOK_SECRET } from "../config/stripe";

export type StripeWebhookRequest = Request & {
  stripeEvent?: Stripe.Event;
};
//verifies that incoming webhook requests actually came from stripe and were not tampered
//sign signature from headers and send
export function verifyStripeWebhookSignature(
  req: StripeWebhookRequest,
  res: Response,
  next: NextFunction
): void {
  const sig = req.headers["stripe-signature"];
  if (!sig || Array.isArray(sig)) {
    res.status(400).json({ message: "Missing stripe-signature header" });
    return;
  }

  try {
    req.stripeEvent = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET); //
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook signature verification failed:", message);
    res.status(400).json({ message: `Webhook Error: ${message}` });
  }
}
