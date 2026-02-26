import db from "../config/knex";
import type { Knex } from "knex";

export interface ReservationRow {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  status: string;
  expires_at: Date;
  created_at: Date;
}

const checkAvailability = async (
  productId: number,
  requestedQty: number
): Promise<{ available: boolean; currentStock: number; reserved: number }> => {
  const product = await db("products")
    .select("stock")
    .where({ id: productId })
    .first();

  if (!product) {
    return { available: false, currentStock: 0, reserved: 0 };
  }

  const reservedRow = await db("inventory_reservations")
    .where({ product_id: productId, status: "pending" })
    .sum<{ reserved: string | number }>("quantity as reserved")
    .first();

  const reserved = Number(reservedRow?.reserved ?? 0);
  const currentStock = Number(product.stock);
  const availableStock = currentStock - reserved;

  return {
    available: availableStock >= requestedQty,
    currentStock,
    reserved,
  };
};

const reserve = async (
  userId: number,
  items: { productId: number; quantity: number }[]
): Promise<{ success: boolean; reservations?: ReservationRow[]; error?: string }> => {
  return db.transaction(async (trx: Knex.Transaction) => {
    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const requestedByProduct = new Map<number, number>();

    for (const item of items) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) ?? 0) + item.quantity
      );
    }

    const lockedProducts = await trx("products")
      .select("id", "stock")
      .whereIn("id", productIds)
      .forUpdate();

    if (lockedProducts.length !== productIds.length) {
      return { success: false, error: "One or more products do not exist" };
    }

    const reservedRows = (await trx("inventory_reservations")
      .select("product_id")
      .sum("quantity as reserved")
      .whereIn("product_id", productIds)
      .andWhere("status", "pending")
      .groupBy("product_id")) as Array<{ product_id: number; reserved: string | number }>;

    const reservedMap = new Map<number, number>(
      reservedRows.map((row: { product_id: number; reserved: string | number }) => [
        row.product_id,
        Number(row.reserved ?? 0),
      ])
    );

    for (const product of lockedProducts) {
      const requestedQty = requestedByProduct.get(product.id) ?? 0;
      const reserved = reservedMap.get(product.id) ?? 0;
      const currentStock = Number(product.stock);
      const availableQty = currentStock - reserved;

      if (availableQty < requestedQty) {
        return {
          success: false,
          error: `Product ${product.id} - only ${availableQty} available, requested ${requestedQty}`,
        };
      }
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const rows = (await trx("inventory_reservations")
      .insert(
        items.map((item) => ({
          user_id: userId,
          product_id: item.productId,
          quantity: item.quantity,
          status: "pending",
          expires_at: expiresAt,
        }))
      )
      .returning("*")) as ReservationRow[];

    return { success: true, reservations: rows };
  });
};

const confirm = async (
  reservationIds: number[]
): Promise<{ success: boolean; error?: string }> => {
  return db.transaction(async (trx: Knex.Transaction) => {
    const reservations = (await trx("inventory_reservations")
      .select("*")
      .whereIn("id", reservationIds)
      .andWhere("status", "pending")
      .forUpdate()) as ReservationRow[];

    if (reservations.length !== reservationIds.length) {
      return { success: false, error: "Some reservations not found or already processed" };
    }

    const requiredByProduct = new Map<number, number>();
    for (const reservation of reservations) {
      requiredByProduct.set(
        reservation.product_id,
        (requiredByProduct.get(reservation.product_id) ?? 0) + reservation.quantity
      );
    }

    const requiredProductIds = Array.from(requiredByProduct.keys());

    const lockedProducts = await trx("products")
      .select("id", "stock")
      .whereIn("id", requiredProductIds)
      .forUpdate();

    if (lockedProducts.length !== requiredProductIds.length) {
      return { success: false, error: "Insufficient stock for one or more products" };
    }

    for (const product of lockedProducts) {
      const requiredQty = requiredByProduct.get(product.id) ?? 0;
      if (Number(product.stock) < requiredQty) {
        return { success: false, error: "Insufficient stock for one or more products" };
      }
    }

    for (const [productId, requiredQty] of requiredByProduct) {
      await trx("products")
        .where({ id: productId })
        .update({
          stock: trx.raw("stock - ?", [requiredQty]),
        });
    }

    await trx("inventory_reservations")
      .whereIn("id", reservationIds)
      .update({ status: "confirmed" });

    return { success: true };
  });
};

const release = async (
  reservationIds: number[],
  reason: "expired" | "cancelled" = "cancelled"
): Promise<{ success: boolean }> => {
  await db("inventory_reservations")
    .whereIn("id", reservationIds)
    .andWhere("status", "pending")
    .update({ status: reason });

  return { success: true };
};

const getPendingByUser = async (userId: number): Promise<ReservationRow[]> => {
  return db<ReservationRow>("inventory_reservations as r")
    .join("products as p", "r.product_id", "p.id")
    .select("r.*", "p.title", "p.price", "p.thumbnail")
    .where("r.user_id", userId)
    .andWhere("r.status", "pending")
    .orderBy("r.created_at", "desc");
};

const releaseExpired = async (): Promise<number> => {
  const rows = await db("inventory_reservations")
    .where("status", "pending")
    .andWhere("expires_at", "<", db.fn.now())
    .update({ status: "expired" })
    .returning("id");

  return rows.length;
};

const getByIntentId = async (id: string): Promise<ReservationRow | null> => {
  const row = await db<ReservationRow>("inventory_reservations")
    .select("*")
    .where({ id: parseInt(id, 10) })
    .first();

  return row ?? null;
};

export default {
  checkAvailability,
  reserve,
  confirm,
  release,
  getPendingByUser,
  releaseExpired,
  getByIntentId,
};
