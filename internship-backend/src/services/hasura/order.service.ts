import InventoryModel from "../../models/inventory.model";
import OrderModel from "../../models/order.model";
import db from "../../config/knex";
import { toPaymentStatus } from "../../shared/payments/paymentStatus";
import { createHash } from "crypto";
import { cancelWorkflowById } from "../../temporal/client";
import type { Knex } from "knex";

type SessionUser = {
  userId: number;
  firebaseUid: string;
};

type CreateOrderInput = {
  items: Array<{
    productId: number;
    quantity: number;
  }>;
  address: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: string;
  total: number;
  orderId?: string;
  orderDate?: string;
};

type CreateOrderActionResponse = {
  orderId: string;
  orderDate: string;
  status: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
};

type CreateOrderTxResult = CreateOrderActionResponse & {
  cancelledOrderExternalIds?: string[];
};

let hasCheckoutIdempotencyTableCache: boolean | null = null;

async function canUseCheckoutIdempotency(trx: Knex.Transaction): Promise<boolean> {
  if (hasCheckoutIdempotencyTableCache !== null) {
    return hasCheckoutIdempotencyTableCache;
  }

  const exists = await trx.schema.hasTable("checkout_idempotency");
  hasCheckoutIdempotencyTableCache = exists;
  return exists;
}

const buildCheckoutRequestHash = (params: {
  userId: number;
  paymentMethod: string;
  items: Array<{ productId: number; quantity: number; price: number }>;
  address: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
  };
  total: number;
}): string => {
  const payload = {
    userId: params.userId,
    paymentMethod: params.paymentMethod.trim().toLowerCase(),
    items: [...params.items].sort((a, b) => a.productId - b.productId),
    address: params.address,
    total: Number(params.total.toFixed(2)),
  };

  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
};

export async function createOrderFromActionInput(
  session: SessionUser,
  input: CreateOrderInput
): Promise<CreateOrderActionResponse> {
  const { items, address, paymentMethod, orderId, orderDate } = input;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error("items array required");
  }
  if (!address || !address.fullName || !address.phone || !address.addressLine1) {
    throw new Error("Complete address required");
  }
  if (!paymentMethod) {
    throw new Error("paymentMethod required");
  }

  const normalizedItems = items.map((item) => ({
    productId: Number(item.productId),
    quantity: Number(item.quantity),
  }));

  if (normalizedItems.some((item) => !Number.isInteger(item.productId) || item.productId <= 0)) {
    throw new Error("Invalid product in order");
  }
  if (normalizedItems.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0)) {
    throw new Error("Invalid quantity in order");
  }

  const requestedByProduct = new Map<number, number>();
  for (const item of normalizedItems) {
    requestedByProduct.set(item.productId, (requestedByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const productIds = Array.from(requestedByProduct.keys());
  const dbProducts = await db("products")
    .select("id", "title", "price", "thumbnail")
    .whereIn("id", productIds);

  if (dbProducts.length !== productIds.length) {
    throw new Error("One or more products are unavailable");
  }

  const productMap = new Map<number, { id: number; title: string; price: number; thumbnail: string }>(
    dbProducts.map((product) => [
      Number(product.id),
      {
        id: Number(product.id),
        title: String(product.title ?? ""),
        price: Number(product.price ?? 0),
        thumbnail: String(product.thumbnail ?? ""),
      },
    ])
  );

  for (const [productId, requestedQty] of requestedByProduct) {
    const availability = await InventoryModel.checkAvailability(productId, requestedQty);
    if (!availability.available) {
      const availableQty = Math.max(availability.currentStock - availability.reserved, 0);
      throw new Error(
        `Insufficient stock for product ${productId}. Requested ${requestedQty}, available ${availableQty}`
      );
    }
  }

  const finalOrderId = orderId || `ORD-${Date.now()}`;

  const orderItems = normalizedItems.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("One or more products are unavailable");
    }

    return {
      productId: item.productId,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      quantity: item.quantity,
    };
  });

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const requestHash = buildCheckoutRequestHash({
    userId: session.userId,
    paymentMethod,
    items: orderItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.price ?? 0),
    })),
    address: {
      fullName: address.fullName,
      phone: address.phone,
      email: address.email,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    },
    total: subtotal,
  });
  // Attempt-scoped idempotency key from client-provided order/attempt id.
  const idempotencyKey = `attempt:${finalOrderId}`;

  const result = await db.transaction(async (trx): Promise<CreateOrderTxResult> => {
    const supportsCheckoutIdempotency = await canUseCheckoutIdempotency(trx);

    if (supportsCheckoutIdempotency) {
      const idempotentRecord = await trx("checkout_idempotency")
        .select("order_external_id", "expires_at", "request_hash")
        .where({
          user_id: session.userId,
          idempotency_key: idempotencyKey,
        })
        .first()
        .forUpdate();

      const hasValidIdempotencyWindow =
        Boolean(idempotentRecord?.expires_at) &&
        new Date(String(idempotentRecord.expires_at)).getTime() > Date.now();

      if (idempotentRecord?.order_external_id && hasValidIdempotencyWindow) {
        if (String(idempotentRecord.request_hash ?? "") !== requestHash) {
          throw new Error("Checkout attempt data changed for the same orderId");
        }

        const existingOrder = await OrderModel.getByOrderId(
          String(idempotentRecord.order_external_id),
          session.userId
        );
        if (existingOrder && String(existingOrder.status).toLowerCase() !== "cancelled") {
          return {
            orderId: String(existingOrder.order_id),
            orderDate: existingOrder.created_at
              ? new Date(existingOrder.created_at).toISOString()
              : (orderDate || new Date().toISOString()),
            status: String(existingOrder.status ?? "pending"),
            orderStatus: String(existingOrder.status ?? "pending"),
            paymentStatus: toPaymentStatus(paymentMethod, "pending"),
            paymentMethod,
            total: Number(existingOrder.total ?? 0),
          };
        }
      }
    }

    const explicitOrder = await trx("orders")
      .select("order_id", "status", "total", "created_at")
      .where({ order_id: finalOrderId, user_id: session.userId })
      .first();

    if (explicitOrder) {
      return {
        orderId: String(explicitOrder.order_id),
        orderDate: explicitOrder.created_at
          ? new Date(explicitOrder.created_at).toISOString()
          : (orderDate || new Date().toISOString()),
        status: String(explicitOrder.status ?? "pending"),
        orderStatus: String(explicitOrder.status ?? "pending"),
        paymentStatus: toPaymentStatus(paymentMethod, "pending"),
        paymentMethod,
        total: Number(explicitOrder.total ?? 0),
      };
    }

    const pendingOrders = await trx("orders")
      .select("id", "order_id")
      .where({ user_id: session.userId, status: "pending" })
      .andWhereNot("order_id", finalOrderId)
      .forUpdate();
    let cancelledOrderExternalIds: string[] = [];

    if (pendingOrders.length > 0) {
      const pendingOrderDbIds = pendingOrders.map((row: { id: number }) => Number(row.id));
      const pendingOrderExternalIds = pendingOrders.map((row: { order_id: string }) => String(row.order_id));
      cancelledOrderExternalIds = pendingOrderExternalIds;

      await trx("orders")
        .whereIn("id", pendingOrderDbIds)
        .update({ status: "cancelled", updated_at: trx.fn.now() });

      await trx("payments")
        .whereIn("order_id", pendingOrderDbIds)
        .whereIn("status", ["pending", "processing"])
        .update({ status: "cancelled", updated_at: trx.fn.now() });

      await trx("inventory_reservations")
        .whereIn("order_external_id", pendingOrderExternalIds)
        .andWhere("status", "pending")
        .update({ status: "cancelled" });
    }

    await OrderModel.createWithTrx(
      {
        userId: session.userId,
        firebaseUid: session.firebaseUid,
        orderId: finalOrderId,
        paymentMethod,
        items: orderItems,
        address: {
          fullName: address.fullName,
          phone: address.phone,
          email: address.email,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || "",
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        subtotal,
        total: subtotal,
      },
      trx
    );

    if (supportsCheckoutIdempotency) {
      await trx("checkout_idempotency")
        .insert({
          user_id: session.userId,
          idempotency_key: idempotencyKey,
          request_hash: requestHash,
          order_external_id: finalOrderId,
          expires_at: trx.raw("NOW() + INTERVAL '24 hours'"),
        })
        .onConflict(["user_id", "idempotency_key"])
        .merge({
          request_hash: requestHash,
          order_external_id: finalOrderId,
          expires_at: trx.raw("NOW() + INTERVAL '24 hours'"),
          updated_at: trx.fn.now(),
        });
    }

    await trx("cart_items")
      .where({ user_id: session.userId })
      .del();

    return {
      orderId: finalOrderId,
      orderDate: orderDate || new Date().toISOString(),
      status: "pending",
      orderStatus: "pending",
      paymentStatus: toPaymentStatus(paymentMethod, "pending"),
      paymentMethod,
      total: subtotal,
      cancelledOrderExternalIds,
    };
  });

  if (result.cancelledOrderExternalIds && result.cancelledOrderExternalIds.length > 0) {
    await Promise.all(
      result.cancelledOrderExternalIds.map(async (oldOrderId) => {
        try {
          await cancelWorkflowById(`order-${oldOrderId}`);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`Failed to cancel superseded workflow order-${oldOrderId}:`, message);
        }
      })
    );
  }

  const { cancelledOrderExternalIds, ...response } = result;
  return response;
}
//db transaction 
//handle idempotency
//cancel old pending orders
//create new order
//save idempotency record
//clear cart


//cancel old workflows
//response