import InventoryModel from "../../models/inventory.model";

export async function releaseInventoryActivity(
  reservationIds: number[]
): Promise<void> {
  console.log("Activity: Releasing inventory", { reservationIds });

  await InventoryModel.release(reservationIds, "cancelled");

  console.log("Activity: Inventory released");
}

export async function checkReservationStatusActivity(
  reservationId: number
): Promise<string> {
  console.log("Activity: Checking reservation status", { reservationId });

  const reservation = await InventoryModel.getByIntentId(reservationId.toString());

  if (!reservation) {
    return "not_found";
  }

  console.log("Activity: Reservation status", reservation.status);
  return reservation.status;
}

// Sweep orphan/expired pending reservations as a Temporal-managed safety net.
export async function releaseExpiredReservationsActivity(): Promise<number> {
  console.log("Activity: Releasing expired reservations");
  const count = await InventoryModel.releaseExpired();
  if (count > 0) {
    console.log(`Activity: Released ${count} expired reservations`);
  }
  return count;
}
