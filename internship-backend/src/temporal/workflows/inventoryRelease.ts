import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities/inventory.activities';

// Create activity proxies
const {
  releaseInventoryActivity,
  checkReservationStatusActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

// Workflow input
export interface InventoryReleaseInput {
  reservationIds: number[];
  orderId: string;
  waitMinutes: number;
}

// ─── INVENTORY RELEASE WORKFLOW ───────────────────────────────
// Automatically releases inventory if not confirmed within timeout
// ─────────────────────────────────────────────────────────────
export async function inventoryReleaseWorkflow(
  input: InventoryReleaseInput
): Promise<{ released: boolean; reason: string }> {
  
  console.log('⏰ Inventory Release Workflow started:', {
    orderId: input.orderId,
    reservationIds: input.reservationIds,
    waitMinutes: input.waitMinutes,
  });
  
  // ─── STEP 1: Sleep for timeout period ─────────────────────
  console.log(`💤 Sleeping for ${input.waitMinutes} minutes...`);
  await sleep(`${input.waitMinutes} minutes`);
  
  console.log('⏰ Timeout reached - Checking reservation status...');
  
  // ─── STEP 2: Check if reservation was already confirmed ───
  const status = await checkReservationStatusActivity(input.reservationIds[0]);
  
  if (status === 'confirmed') {
    console.log('✅ Reservation already confirmed - No action needed');
    return { released: false, reason: 'already_confirmed' };
  }
  
  if (status === 'cancelled' || status === 'expired') {
    console.log('ℹ️ Reservation already released - No action needed');
    return { released: false, reason: 'already_released' };
  }
  
  // ─── STEP 3: Release inventory ────────────────────────────
  console.log('📤 Releasing inventory - Payment not received');
  await releaseInventoryActivity(input.reservationIds);
  
  console.log('✅ Inventory released successfully');
  
  return { released: true, reason: 'timeout' };
}