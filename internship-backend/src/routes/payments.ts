import { Router } from "express";
import {
  createPaymentIntent,
  getPaymentStatus,
} from "../controllers/payment.controller";
import authenticate from "../middleware/auth";

const router = Router();

router.post("/stripe/intent", authenticate, createPaymentIntent);

// Compatibility alias for older frontend path
router.post("/create-payment-intent", authenticate, createPaymentIntent);

router.get("/:orderId", authenticate, getPaymentStatus);

export default router;
