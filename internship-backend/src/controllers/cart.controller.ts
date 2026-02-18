import { Response } from "express";
import CartModel from "../models/cart.model";
import { AuthRequest } from "../middleware/auth";

// ─── Helper: format cart item to match frontend CartItem shape ─
// Frontend cartSlice expects: id, title, price, thumbnail, images, quantity
const formatItem = (row: any) => ({
  id:        row.product_id,  // ← frontend uses product_id as id
  title:     row.title,
  price:     Number(row.price),
  thumbnail: row.thumbnail,
  images:    row.images,
  quantity:  row.quantity,
  cartId:    row.id,          // ← DB row id for update/delete
});

// ─── GET /cart ────────────────────────────────────────────────
// Returns cart items for logged-in user
// ─────────────────────────────────────────────────────────────
export const getCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const items  = await CartModel.getByUserId(userId);

    res.json({
      items: items.map(formatItem),
      total: items.length,
    });
  } catch (err: any) {
    console.error("getCart error:", err.message);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
};

// ─── POST /cart ───────────────────────────────────────────────
// Add item to cart — matches addToCart Redux action payload
// ─────────────────────────────────────────────────────────────
export const addToCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const {
      id:        productId,
      title,
      price,
      thumbnail,
      images    = [],
      quantity  = 1,
    } = req.body;

    if (!productId || !title || !price) {
      res.status(400).json({ message: "productId, title, price required" });
      return;
    }

    const item = await CartModel.upsert(
      userId,
      productId,
      title,
      price,
      Array.isArray(thumbnail) ? thumbnail[0] ?? "": thumbnail ?? "",

      Array.isArray(images) ? images: [],
      quantity
    );

    res.status(201).json({
      message: "Item added to cart",
      item:    formatItem(item),
    });
  } catch (err: any) {
    console.error("addToCart error:", err.message);
    res.status(500).json({ message: "Failed to add to cart" });
  }
};

// ─── PUT /cart/:cartId ────────────────────────────────────────
// Update quantity of a cart item
// ─────────────────────────────────────────────────────────────
export const updateQuantity = async (req: AuthRequest, res: Response) => {
  try {
    const userId  = req.user?.userId!;
    const cartIdParam = req.params.cartId;

    if(Array.isArray(cartIdParam)){
        res.status(400).json({message: "Invalid cart Id"});
        return;
    }

    const cartId=parseInt(cartIdParam);
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      res.status(400).json({ message: "Quantity must be at least 1" });
      return;
    }

    const item = await CartModel.updateQuantity(cartId, userId, quantity);

    if (!item) {
      res.status(404).json({ message: "Cart item not found" });
      return;
    }

    res.json({
      message: "Quantity updated",
      item:    formatItem(item),
    });
  } catch (err: any) {
    console.error("updateQuantity error:", err.message);
    res.status(500).json({ message: "Failed to update quantity" });
  }
};

// ─── DELETE /cart/:cartId ─────────────────────────────────────
// Remove single item from cart
// ─────────────────────────────────────────────────────────────
export const removeFromCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const cartIdParam = req.params.cartId;

    if(Array.isArray(cartIdParam)){
        res.status(400).json({message: "Invalid cart ID"});
        return;
    }

    const cartId=parseInt(cartIdParam);

    const deleted = await CartModel.removeItem(cartId, userId);

    if (!deleted) {
      res.status(404).json({ message: "Cart item not found" });
      return;
    }

    res.json({ message: "Item removed from cart" });
  } catch (err: any) {
    console.error("removeFromCart error:", err.message);
    res.status(500).json({ message: "Failed to remove item" });
  }
};

// ─── DELETE /cart ─────────────────────────────────────────────
// Clear entire cart
// ─────────────────────────────────────────────────────────────
export const clearCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    await CartModel.clearCart(userId);
    res.json({ message: "Cart cleared" });
  } catch (err: any) {
    console.error("clearCart error:", err.message);
    res.status(500).json({ message: "Failed to clear cart" });
  }
};

// ─── POST /cart/sync ──────────────────────────────────────────
// Sync entire cart from frontend to Postgres
// Called on login to push IndexedDB cart → Postgres
// ─────────────────────────────────────────────────────────────
export const syncCart = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const { items } = req.body;

    if (!Array.isArray(items)) {
      res.status(400).json({ message: "items array required" });
      return;
    }

    // Map frontend CartItem shape → DB shape
    const mapped = items.map((item: any) => ({
      product_id: item.id,
      title:      item.title,
      price:      item.price,
      thumbnail:  Array.isArray(item.thumbnail)
         ? item.thumbnail[0] ?? ""
         : item.thumbnail ?? "",
      images:      Array.isArray(item.images)
        ? item.images
         : [],
      quantity:   item.quantity,
    }));

    const synced = await CartModel.syncCart(userId, mapped);

    res.json({
      message: "Cart synced",
      items:   synced.map(formatItem),
      total:   synced.length,
    });
  } catch (err: any) {
    console.error("syncCart error:", err.message);
    res.status(500).json({ message: "Failed to sync cart" });
  }
};