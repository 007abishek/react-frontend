import db from "../config/knex";
import type { Knex } from "knex";

// ─── Types ────────────────────────────────────────────────────
export interface CartItemRow {
  id:         number;
  user_id:    number;
  product_id: number;
  title:      string;
  price:      number;
  thumbnail:  string;
  images:     string[];
  quantity:   number;
}

// ─── Get all cart items for a user ───────────────────────────
const getByUserId = async (userId: number): Promise<CartItemRow[]> => {
  return db<CartItemRow>("cart_items")
    .select(
      "id",
      "user_id",
      "product_id",
      "title",
      "price",
      "thumbnail",
      "images",
      "quantity"
    )
    .where({ user_id: userId })
    .orderBy("created_at", "asc");
};

// ─── Add item or increase quantity if exists ──────────────────
const upsert = async (
  userId:    number,
  productId: number,
  title:     string,
  price:     number,
  thumbnail: string,
  images:    string[],
  quantity:  number
): Promise<CartItemRow> => {
  const rows = (await db("cart_items")
    .insert({
      user_id: userId,
      product_id: productId,
      title,
      price,
      thumbnail,
      images,
      quantity,
    })
    .onConflict(["user_id", "product_id"])
    .merge({
      quantity: db.raw("cart_items.quantity + EXCLUDED.quantity"),
      updated_at: db.fn.now(),
    })
    .returning("*")) as CartItemRow[];

  return rows[0];
};

// ─── Update quantity directly ─────────────────────────────────
const updateQuantity = async (
  id:       number,
  userId:   number,
  quantity: number
): Promise<CartItemRow | null> => {
  const rows = (await db("cart_items")
    .where({ id, user_id: userId })
    .update({
      quantity,
      updated_at: db.fn.now(),
    })
    .returning("*")) as CartItemRow[];

  return rows[0] ?? null;
};

// ─── Remove single item ───────────────────────────────────────
const removeItem = async (
  id:     number,
  userId: number
): Promise<boolean> => {
  const deleted = await db("cart_items")
    .where({ id, user_id: userId })
    .delete();

  return deleted > 0;
};

// ─── Clear entire cart ────────────────────────────────────────
const clearCart = async (userId: number): Promise<void> => {
  await db("cart_items")
    .where({ user_id: userId })
    .delete();
};

// ─── Sync entire cart (used on login) ────────────────────────
// Replaces all items for a user in one transaction
const syncCart = async (
  userId: number,
  items:  Omit<CartItemRow, "id" | "user_id">[]
): Promise<CartItemRow[]> => {
  return db.transaction(async (trx: Knex.Transaction) => {
    await trx("cart_items")
      .where({ user_id: userId })
      .delete();

    if (items.length > 0) {
      await trx("cart_items").insert(
        items.map((item) => ({
          user_id: userId,
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          thumbnail: item.thumbnail,
          images: item.images,
          quantity: item.quantity,
        }))
      );
    }

    return trx("cart_items")
      .select("*")
      .where({ user_id: userId })
      .orderBy("created_at", "asc") as Promise<CartItemRow[]>;
  });
};

export default {
  getByUserId,
  upsert,
  updateQuantity,
  removeItem,
  clearCart,
  syncCart,
};
