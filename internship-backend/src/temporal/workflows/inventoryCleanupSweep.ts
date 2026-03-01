import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/inventory.activities";

const { releaseExpiredReservationsActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
  retry: {
    initialInterval: "1s",
    maximumInterval: "30s",
    backoffCoefficient: 2,
    maximumAttempts: 5,
  },
});

export async function inventoryCleanupSweepWorkflow(): Promise<{ released: number }> {
  const released = await releaseExpiredReservationsActivity();
  return { released };
}

