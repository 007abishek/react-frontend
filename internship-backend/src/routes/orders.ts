import { Router } from "express";
import {
  createOrder,
  getUserOrders,
  getOrderById,
} from "../controllers/order.controller";
import authenticate from "../middleware/auth";

const router = Router();

// ─── All order routes are protected ──────────────────────────

// POST /orders
router.post("/", authenticate, createOrder);
// GET /orders
router.get("/", authenticate, getUserOrders);

// GET /orders/:orderId
router.get("/:orderId", authenticate, getOrderById);

export default router;