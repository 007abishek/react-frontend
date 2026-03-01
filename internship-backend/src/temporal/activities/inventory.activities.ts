import InventoryModel from "../../models/inventory.model";
import OrderModel from "../../models/order.model";

// ─── Reserve inventory for order ──────────────────────────────
export async function reserveInventoryActivity(
  userId: number,
  items: Array<{ productId: number; quantity: number }>
): Promise<number[]> {
  console.log('🔧 Activity: Reserving inventory', { userId, items });
  
  const result = await InventoryModel.reserve(userId, items);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to reserve inventory');
  }
  
  const reservationIds = result.reservations!.map(r => r.id);
  console.log('✅ Activity: Inventory reserved', { reservationIds });
  
  return reservationIds;
}

// ─── Confirm inventory reservation ────────────────────────────
export async function confirmInventoryActivity(
  reservationIds: number[]
): Promise<void> {
  console.log('🔧 Activity: Confirming inventory', { reservationIds });
  
  const result = await InventoryModel.confirm(reservationIds);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to confirm inventory');
  }
  
  console.log('✅ Activity: Inventory confirmed');
}

// ─── Release inventory reservation ────────────────────────────
export async function releaseInventoryActivity(
  reservationIds: number[]
): Promise<void> {
  console.log('🔧 Activity: Releasing inventory', { reservationIds });
  
  await InventoryModel.release(reservationIds, 'cancelled');
  
  console.log('✅ Activity: Inventory released');
}

// ─── Check reservation status ─────────────────────────────────
export async function checkReservationStatusActivity(
  reservationId: number
): Promise<string> {
  console.log('🔧 Activity: Checking reservation status', { reservationId });
  
  const reservation = await InventoryModel.getByIntentId(reservationId.toString());
  
  if (!reservation) {
    return 'not_found';
  }
  
  console.log('✅ Activity: Reservation status:', reservation.status);
  return reservation.status;
}

// ─── Update order status ──────────────────────────────────────
export async function updateOrderStatusActivity(
  orderId: string,
  status: string
): Promise<void> {
  console.log('🔧 Activity: Updating order status', { orderId, status });
  
  await OrderModel.updateStatus(orderId, status);
  
  console.log('✅ Activity: Order status updated');
}

// ─── Send email notification ──────────────────────────────────
export async function sendEmailActivity(
  type: 'confirmation' | 'cancellation',
  orderId: string,
  email: string
): Promise<void> {
  console.log('🔧 Activity: Sending email', { type, orderId, email });
  
  // TODO: Integrate with SendGrid/AWS SES
  // For now, just log
  console.log(`📧 Email sent: ${type} for order ${orderId} to ${email}`);
  
  console.log('✅ Activity: Email sent');
}

// Sweep orphan/expired pending reservations as a Temporal-managed safety net.
export async function releaseExpiredReservationsActivity(): Promise<number> {
  console.log("🔧 Activity: Releasing expired reservations");
  const count = await InventoryModel.releaseExpired();
  if (count > 0) {
    console.log(`✅ Activity: Released ${count} expired reservations`);
  }
  return count;
}
