import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "../activities/inventory.activities";

const { releaseInventoryActivity, checkReservationStatusActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
  retry: {
    initialInterval: "1s",
    maximumInterval: "1 minute",
    backoffCoefficient: 2,
    maximumAttempts: 8,
  },
});

export interface InventoryReleaseInput {
  reservationIds: number[];
  orderId: string;
  waitMinutes: number;
}

export async function inventoryReleaseWorkflow(
  input: InventoryReleaseInput
): Promise<{ released: boolean; reason: string }> {
  await sleep(`${input.waitMinutes} minutes`);

  const statuses = await Promise.all(
    input.reservationIds.map((reservationId) => checkReservationStatusActivity(reservationId))
  );

  const hasConfirmed = statuses.some((s) => s === "confirmed");
  if (hasConfirmed) {
    return { released: false, reason: "already_confirmed" };
  }

  const allReleased = statuses.every((s) => s === "cancelled" || s === "expired" || s === "not_found");
  if (allReleased) {
    return { released: false, reason: "already_released" };
  }

  await releaseInventoryActivity(input.reservationIds);
  return { released: true, reason: "timeout" };
}
