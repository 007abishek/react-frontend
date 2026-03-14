import { Router } from "express";
import {
  attachHasuraSessionUser,
  ensureHasuraActionSecret,
  ensureHasuraEventSecret,
} from "../middleware/hasura";
import {
  handleAuthLoginAction,
  handleCreateOrderAction,
  handleInvokeEmailLambdaAction,
  handleCreateStripePaymentIntentAction,
  handleOrderInsertedEvent,
  handleGetPaymentStatusAction,
  handleIssueHasuraTokenAction,

  handleSendOtpAction,
  handleVerifyOtpAction
} from "../controllers/hasura";

const router = Router();

// ── Event Triggers ──────────────────────────────────────────────
// Called by Hasura when DB events occur (server-to-server)
router.post("/events/order-inserted", ensureHasuraEventSecret, handleOrderInsertedEvent);

// ── Actions ─────────────────────────────────────────────────────
// Called by Hasura when a client executes a GraphQL action mutation
router.post("/actions/auth-login", ensureHasuraActionSecret, handleAuthLoginAction);
router.post("/actions/issue-hasura-token", ensureHasuraActionSecret, handleIssueHasuraTokenAction);
router.post(
  "/actions/create-order",
  ensureHasuraActionSecret,
  attachHasuraSessionUser,
  handleCreateOrderAction
);
router.post(
  "/actions/create-stripe-payment-intent",
  ensureHasuraActionSecret,
  attachHasuraSessionUser,
  handleCreateStripePaymentIntentAction
);
router.post(
  "/actions/get-payment-status",
  ensureHasuraActionSecret,
  attachHasuraSessionUser,
  handleGetPaymentStatusAction
);
router.post("/actions/invoke-email-lambda", ensureHasuraActionSecret, handleInvokeEmailLambdaAction);

//otp
router.post("/actions/send-otp",ensureHasuraActionSecret,handleSendOtpAction);
router.post("/actions/verify-otp",ensureHasuraActionSecret,handleVerifyOtpAction);
export default router;
