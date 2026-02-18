import { Router } from "express";
import {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  syncCart,
} from "../controllers/cart.controller";
import authenticate from "../middleware/auth";

const router = Router();

// ─── All cart routes are protected ───────────────────────────
// Guest users cannot have a server-side cart

// GET /cart
router.get("/",           authenticate, getCart);

// POST /cart/sync  ← must be BEFORE /:cartId
router.post("/sync",      authenticate, syncCart);

// POST /cart
router.post("/",          authenticate, addToCart);

// PUT /cart/:cartId
router.put("/:cartId",    authenticate, updateQuantity);

// DELETE /cart  ← must be BEFORE /:cartId
router.delete("/",        authenticate, clearCart);

// DELETE /cart/:cartId
router.delete("/:cartId", authenticate, removeFromCart);

export default router;