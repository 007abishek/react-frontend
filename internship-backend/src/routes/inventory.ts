import { Router } from "express";
import {
  reserveInventory,
  confirmReservation,
  releaseReservation,
  checkAvailability,
  getUserReservations,
  cleanupExpired,
} from "../controllers/inventory.controller";
import authenticate from "../middleware/auth";

const router = Router();

// ─── All inventory routes are protected ──────────────────────

// POST /inventory/reserve
router.post("/reserve", authenticate, reserveInventory);

// POST /inventory/confirm
router.post("/confirm", authenticate, confirmReservation);

// POST /inventory/release
router.post("/release", authenticate, releaseReservation);

// GET /inventory/check?productId=1&quantity=2
router.get("/check", authenticate, checkAvailability);

// GET /inventory/reservations
router.get("/reservations", authenticate, getUserReservations);

// POST /inventory/cleanup (cron job endpoint)
router.post("/cleanup", authenticate, cleanupExpired);

export default router;