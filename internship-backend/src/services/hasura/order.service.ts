import CartModel from "../../models/cart.model";
import InventoryModel from "../../models/inventory.model";
import OrderModel from "../../models/order.model";
import db from "../../config/knex";
import { toPaymentStatus } from "../../controllers/hasura/helpers";

type SessionUser = {
  userId: number;
  firebaseUid: string;
};

type CreateOrderInput = {
  items: Array<{
    productId: number;
    title: string;
    price: number;
    thumbnail?: string;
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

export async function createOrderFromActionInput(session: SessionUser, input: CreateOrderInput): Promise<{
  orderId: string;
  orderDate: string;
  status: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  total: number;
}> {
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

  await OrderModel.create({
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
  });

  await CartModel.clearCart(session.userId);

  return {
    orderId: finalOrderId,
    orderDate: orderDate || new Date().toISOString(),
    status: "pending",
    orderStatus: "pending",
    paymentStatus: toPaymentStatus(paymentMethod, "pending"),
    paymentMethod,
    total: subtotal,
  };
}
