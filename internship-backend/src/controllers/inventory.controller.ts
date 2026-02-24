import { Response } from "express";
import InventoryModel from "../models/inventory.model";
import { AuthRequest } from "../middleware/auth";

// ─── POST /inventory/reserve ──────────────────────────────────
// Reserve stock when user starts checkout
// ─────────────────────────────────────────────────────────────
export const reserveInventory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const { items } = req.body;

    // Validate request
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "items array required" });
      return;
    }

    // Validate each item has productId and quantity
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        res.status(400).json({ 
          message: "Each item needs productId and quantity >= 1" 
        });
        return;
      }
    }

    // Attempt to reserve
    const result = await InventoryModel.reserve(userId, items);

    if (!result.success) {
      res.status(409).json({ 
        message: result.error || "Unable to reserve inventory" 
      });
      return;
    }

    res.status(201).json({
      message: "Inventory reserved",
      reservations: result.reservations,
      expiresIn: "1 minute",
    });

  } catch (err: any) {
    console.error("reserveInventory error:", err.message);
    res.status(500).json({ message: "Failed to reserve inventory" });
  }
};

// ─── POST /inventory/confirm ──────────────────────────────────
// Confirm reservation after payment success
// Reduces actual stock
// ─────────────────────────────────────────────────────────────
export const confirmReservation = async (req: AuthRequest, res: Response) => {
  try {
    const { reservationIds } = req.body;

    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
      res.status(400).json({ message: "reservationIds array required" });
      return;
    }

    const result = await InventoryModel.confirm(reservationIds);

    if (!result.success) {
      res.status(400).json({ 
        message: result.error || "Unable to confirm reservation" 
      });
      return;
    }

    res.json({ message: "Reservation confirmed, stock updated" });

  } catch (err: any) {
    console.error("confirmReservation error:", err.message);
    res.status(500).json({ message: "Failed to confirm reservation" });
  }
};

// ─── POST /inventory/release ──────────────────────────────────
// Release reservation on cancel or timeout
// ─────────────────────────────────────────────────────────────
export const releaseReservation = async (req: AuthRequest, res: Response) => {
  try {
    const { reservationIds, reason } = req.body;

    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
      res.status(400).json({ message: "reservationIds array required" });
      return;
    }

    const validReasons = ["expired", "cancelled"];
    const releaseReason = validReasons.includes(reason) 
      ? reason 
      : "cancelled";

    await InventoryModel.release(reservationIds, releaseReason);

    res.json({ message: "Reservation released" });

  } catch (err: any) {
    console.error("releaseReservation error:", err.message);
    res.status(500).json({ message: "Failed to release reservation" });
  }
};

// ─── GET /inventory/check ─────────────────────────────────────
// Check product availability before checkout
// ─────────────────────────────────────────────────────────────
export const checkAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const productId = parseInt(req.query.productId as string);
    const quantity  = parseInt(req.query.quantity as string) || 1;

    if (isNaN(productId)) {
      res.status(400).json({ message: "productId required" });
      return;
    }

    const result = await InventoryModel.checkAvailability(productId, quantity);

    res.json({
      productId,
      requestedQuantity: quantity,
      available: result.available,
      currentStock: result.currentStock,
      reserved: result.reserved,
      availableStock: result.currentStock - result.reserved,
    });

  } catch (err: any) {
    console.error("checkAvailability error:", err.message);
    res.status(500).json({ message: "Failed to check availability" });
  }
};

// ─── GET /inventory/reservations ──────────────────────────────
// Get user's pending reservations
// ─────────────────────────────────────────────────────────────
export const getUserReservations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const reservations = await InventoryModel.getPendingByUser(userId);

    res.json({
      reservations,
      count: reservations.length,
    });

  } catch (err: any) {
    console.error("getUserReservations error:", err.message);
    res.status(500).json({ message: "Failed to fetch reservations" });
  }
};

// ─── POST /inventory/cleanup (admin/cron) ────────────────────
// Release expired reservations
// Called by cron job every minute
// ─────────────────────────────────────────────────────────────
export const cleanupExpired = async (req: AuthRequest, res: Response) => {
  try {
    const count = await InventoryModel.releaseExpired();

    res.json({
      message: "Cleanup complete",
      releasedCount: count,
    });

  } catch (err: any) {
    console.error("cleanupExpired error:", err.message);
    res.status(500).json({ message: "Cleanup failed" });
  }
};
