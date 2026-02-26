import { Router } from "express";
import {
  handleCreateOrderAction,
  handleCreateStripePaymentIntentAction,
  handleOrderInsertedEvent,
  handleGetPaymentStatusAction,
} from "../controllers/hasura";

const router = Router();

// ── Event Triggers ──────────────────────────────────────────────
// Called by Hasura when DB events occur (server-to-server)
router.post("/events/order-inserted", handleOrderInsertedEvent);

// ── Actions ─────────────────────────────────────────────────────
// Called by Hasura when a client executes a GraphQL action mutation
router.post("/actions/create-order", handleCreateOrderAction);
router.post("/actions/create-stripe-payment-intent", handleCreateStripePaymentIntentAction);
router.post("/actions/get-payment-status", handleGetPaymentStatusAction);

export default router;
