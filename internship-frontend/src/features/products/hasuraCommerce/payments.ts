import { hasuraRequest } from "../../../utils/hasuraClient";
import type { OrderSummaryRow, PaymentStatus } from "./types";

const paymentStatusCache = new Map<string, PaymentStatus>();

export function clearPaymentStatusCache(): void {
  paymentStatusCache.clear();
}

export function normalizePaymentStatus(status?: string): PaymentStatus | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "succeeded") return "succeeded";
  if (normalized === "failed") return "failed";
  if (normalized === "cancelled") return "cancelled";
  return "unknown";
}

export function getFallbackPaymentStatus(order: OrderSummaryRow): PaymentStatus {
  const paymentMethod = order.payment_method.trim().toLowerCase();
  const orderStatus = order.status.trim().toLowerCase();

  if (paymentMethod === "cod") return "not_required";
  if (orderStatus === "cancelled") return "cancelled";
  if (orderStatus === "confirmed" || orderStatus === "processing" || orderStatus === "shipped" || orderStatus === "delivered") {
    return "succeeded";
  }
  return "pending";
}

async function getPaymentStatusAction(orderId: string): Promise<{ status: string; amount: number; currency: string; provider: string }> {
  const data = await hasuraRequest<{ getPaymentStatus: { status: string; amount: number; currency: string; provider: string } }>(
    `
      mutation GetPaymentStatus($orderId: String!) {
        getPaymentStatus(orderId: $orderId) {
          status
          amount
          currency
          provider
        }
      }
    `,
    { orderId }
  );

  return data.getPaymentStatus;
}

export async function getPaymentStatus(order: OrderSummaryRow): Promise<PaymentStatus> {
  const fallback = getFallbackPaymentStatus(order);
  const paymentMethod = order.payment_method.trim().toLowerCase();

  if (paymentMethod === "cod") {
    return "not_required";
  }

  // Avoid extra API calls when order state already implies a terminal payment state.
  if (fallback !== "pending") {
    return fallback;
  }

  const cached = paymentStatusCache.get(order.order_id);
  if (cached) {
    return cached;
  }

  try {
    const data = await getPaymentStatusAction(order.order_id);
    const normalized = normalizePaymentStatus(data.status) ?? fallback;
    paymentStatusCache.set(order.order_id, normalized);
    return normalized;
  } catch (err) {
    console.error("getPaymentStatus error:", err);
    return fallback;
  }
}
