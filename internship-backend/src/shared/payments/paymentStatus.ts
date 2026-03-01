export function toPaymentStatus(
  paymentMethod: string,
  orderStatus: string,
  rawPaymentStatus?: string
): string {
  const normalizedMethod = paymentMethod.trim().toLowerCase();
  if (normalizedMethod === "cod") return "not_required";

  if (rawPaymentStatus) return rawPaymentStatus;

  const normalizedOrderStatus = orderStatus.trim().toLowerCase();
  if (normalizedOrderStatus === "cancelled") return "cancelled";
  if (
    normalizedOrderStatus === "confirmed" ||
    normalizedOrderStatus === "processing" ||
    normalizedOrderStatus === "shipped" ||
    normalizedOrderStatus === "delivered"
  ) {
    return "succeeded";
  }
  return "pending";
}

