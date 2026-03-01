import InventoryModel from "../../models/inventory.model";
import OrderModel from "../../models/order.model";
import type { CreateOrderInput } from "../../models/order.model";
import PaymentModel from "../../models/payment.model";

// Required by Phase 7: validateInventory()
export async function validateInventoryActivity(
  items: Array<{ productId: number; quantity: number }>
): Promise<void> {
  for (const item of items) {
    const check = await InventoryModel.checkAvailability(item.productId, item.quantity);
    if (!check.available) {
      throw new Error(
        `Insufficient stock for product ${item.productId}. Requested=${item.quantity}, Available=${
          check.currentStock - check.reserved
        }`
      );
    }
  }
}

// Required by Phase 7: reserveInventory()
export async function reserveInventoryActivity(
  userId: number,
  items: Array<{ productId: number; quantity: number }>,
  orderId?: string
): Promise<number[]> {
  const result = await InventoryModel.reserve(userId, items, orderId);
  if (!result.success || !result.reservations) {
    throw new Error(result.error || "Failed to reserve inventory");
  }

  return result.reservations.map((r) => r.id);
}

// Required by Phase 7: createOrder()
export async function createOrderActivity(input: CreateOrderInput): Promise<{ orderId: string }> {
  const existing = await OrderModel.getByOrderId(input.orderId, input.userId);
  if (existing) {
    return { orderId: existing.order_id as string };
  }

  const order = await OrderModel.create(input);
  return { orderId: order.order_id };
}

// Required by Phase 7: initiatePayment()
export async function initiatePaymentActivity(params: {
  orderId: string;
  userId: number;
  amount: number;
  currency?: string;
  paymentMethod: string;
}): Promise<void> {
  const order = await OrderModel.getByOrderId(params.orderId, params.userId);
  if (!order) {
    throw new Error("Order not found for payment initiation");
  }

  const existing = await PaymentModel.getByOrderId(order.id);
  if (existing) {
    return;
  }

  const method = params.paymentMethod.trim().toLowerCase();
  const provider = method === "cod" ? "cod" : "stripe";

  await PaymentModel.create({
    orderId: order.id,
    userId: params.userId,
    amount: params.amount,
    currency: (params.currency ?? "inr").toLowerCase(),
    provider,
    status: method === "cod" ? "pending" : "pending",
    stripePaymentIntentId: null,
  });
}

export async function confirmInventoryActivity(reservationIds: number[]): Promise<void> {
  const result = await InventoryModel.confirm(reservationIds);
  if (!result.success) {
    throw new Error(result.error || "Failed to confirm inventory");
  }
}

export async function releaseInventoryActivity(reservationIds: number[]): Promise<void> {
  await InventoryModel.release(reservationIds, "cancelled");
}

// Required by Phase 7: confirmOrder() and rollback()
export async function confirmOrderActivity(orderId: string): Promise<void> {
  await OrderModel.updateStatus(orderId, "confirmed");
}

export async function rollbackOrderActivity(orderId: string): Promise<void> {
  await OrderModel.updateStatus(orderId, "cancelled");
}

export async function updatePaymentStatusByOrderActivity(
  orderId: string,
  status: "pending" | "succeeded" | "failed" | "cancelled"
): Promise<void> {
  const order = await OrderModel.getByOrderIdAny(orderId);
  if (!order) return;

  const existing = await PaymentModel.getByOrderId(order.id);
  if (!existing) return;

  await PaymentModel.updateByOrderId(order.id, { status });
}

export async function checkReservationStatusActivity(reservationId: number): Promise<string> {
  const reservation = await InventoryModel.getByIntentId(reservationId.toString());
  return reservation?.status ?? "not_found";
}

// Used by payment-retry workflow
export async function getPaymentStatusActivity(orderId: string): Promise<string> {
  const result = await OrderModel.getByOrderIdAny(orderId);
  if (!result) return "not_found";

  const payment = await PaymentModel.getByOrderId(result.id);
  return payment?.status ?? "not_found";
}

export async function cancelOrderActivity(orderId: string): Promise<void> {
  await OrderModel.updateStatus(orderId, "cancelled");
  await updatePaymentStatusByOrderActivity(orderId, "failed");
}

export async function retryPaymentActivity(orderId: string): Promise<boolean> {
  const status = await getPaymentStatusActivity(orderId);
  return status === "succeeded";
}

// Required by Phase 7: sendConfirmationEmail() + notification workflows
export async function sendConfirmationEmailActivity(orderId: string, email: string): Promise<void> {
  console.log(`Email: order confirmed ${orderId} -> ${email}`);
}

export async function sendPaymentFailedEmailActivity(orderId: string, email: string): Promise<void> {
  console.log(`Email: payment failed ${orderId} -> ${email}`);
}

export async function sendOrderShippedEmailActivity(orderId: string, email: string): Promise<void> {
  console.log(`Email: order shipped ${orderId} -> ${email}`);
}

export async function sendRetryNotificationActivity(
  orderId: string,
  email: string,
  attempt: number,
  maxAttempts: number
): Promise<void> {
  console.log(`Retry notification ${attempt}/${maxAttempts} for ${orderId} -> ${email}`);
}



