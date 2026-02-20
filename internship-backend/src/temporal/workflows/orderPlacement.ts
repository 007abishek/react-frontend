import { proxyActivities, defineSignal, setHandler, condition } from '@temporalio/workflow';
import type * as activities from '../activities/inventory.activities';

// Create activity proxies (auto-retry on failure)
const {
  reserveInventoryActivity,
  confirmInventoryActivity,
  releaseInventoryActivity,
  updateOrderStatusActivity,
  sendEmailActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
  retry: {
    initialInterval: '1s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

// Define signals
export const paymentCompletedSignal = defineSignal<[boolean]>('paymentCompleted');

// Workflow input
export interface OrderPlacementInput {
  userId: number;
  orderId: string;
  email: string;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
  paymentMethod: string;
}

// ─── ORDER PLACEMENT WORKFLOW ─────────────────────────────────
export async function orderPlacementWorkflow(
  input: OrderPlacementInput
): Promise<{ success: boolean; status: string }> {
  
  console.log('🚀 Workflow started:', input.orderId);
  
  let reservationIds: number[] = [];
  let paymentReceived = false;
  
  // Signal handler
  setHandler(paymentCompletedSignal, (received: boolean) => {
    console.log('📩 Signal received: paymentCompleted =', received);
    paymentReceived = received;
  });
  
  try {
    // ─── STEP 1: Reserve Inventory ────────────────────────────
    console.log('📦 Step 1: Reserving inventory...');
    reservationIds = await reserveInventoryActivity(input.userId, input.items);
    
    // ─── STEP 2: Wait for Payment (15 min timeout) ────────────
    if (input.paymentMethod === 'cod') {
      // COD - instant confirmation
      console.log('💵 Cash on Delivery - Auto-confirming...');
      paymentReceived = true;
    } else {
      // Card/UPI - wait for payment signal
      console.log('💳 Waiting for payment signal (15 min timeout)...');
      
      const paymentCompleted = await condition(
        () => paymentReceived,
        '15 minutes'
      );
      
      if (!paymentCompleted) {
        console.log('⏱️ Payment timeout - Cancelling order...');
        throw new Error('Payment timeout');
      }
    }
    
    // ─── STEP 3: Confirm Order ────────────────────────────────
    console.log('✅ Payment received - Confirming order...');
    
    await confirmInventoryActivity(reservationIds);
    await updateOrderStatusActivity(input.orderId, 'confirmed');
    await sendEmailActivity('confirmation', input.orderId, input.email);
    
    console.log('🎉 Workflow completed successfully:', input.orderId);
    
    return { success: true, status: 'confirmed' };
    
  } catch (error: any) {
    // ─── ROLLBACK: Release inventory and cancel order ─────────
    console.log('❌ Workflow failed - Rolling back...', error.message);
    
    if (reservationIds.length > 0) {
      await releaseInventoryActivity(reservationIds);
    }
    
    await updateOrderStatusActivity(input.orderId, 'cancelled');
    await sendEmailActivity('cancellation', input.orderId, input.email);
    
    console.log('🔄 Rollback complete:', input.orderId);
    
    return { success: false, status: 'cancelled' };
  }
}