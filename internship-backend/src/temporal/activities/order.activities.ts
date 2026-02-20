import OrderModel from "../../models/order.model";
import PaymentModel from "../../models/payment.model";

// ─── Get order details ────────────────────────────────────────
export async function getOrderActivity(
  orderId: string,
  userId: number
): Promise<any> {
  console.log('🔧 Activity: Getting order', { orderId, userId });
  
  const order = await OrderModel.getByOrderId(orderId, userId);
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  console.log('✅ Activity: Order retrieved');
  return order;
}

// ─── Get payment status ───────────────────────────────────────
export async function getPaymentStatusActivity(
  orderId: string
): Promise<string> {
  console.log('🔧 Activity: Getting payment status', { orderId });
  
  // Get order first to get order.id
  const orderResult = await OrderModel.getByOrderId(orderId, 0); // userId not needed for status check
  
  if (!orderResult) {
    return 'not_found';
  }
  
  const payment = await PaymentModel.getByOrderId(orderResult.id);
  
  if (!payment) {
    return 'not_found';
  }
  
  console.log('✅ Activity: Payment status:', payment.status);
  return payment.status;
}

// ─── Cancel order ─────────────────────────────────────────────
export async function cancelOrderActivity(
  orderId: string
): Promise<void> {
  console.log('🔧 Activity: Cancelling order', { orderId });
  
  await OrderModel.updateStatus(orderId, 'cancelled');
  
  console.log('✅ Activity: Order cancelled');
}

// ─── Retry payment ────────────────────────────────────────────
export async function retryPaymentActivity(
  orderId: string,
  attempt: number
): Promise<boolean> {
  console.log('🔧 Activity: Retrying payment', { orderId, attempt });
  
  // Check if payment was completed since last attempt
  const status = await getPaymentStatusActivity(orderId);
  
  if (status === 'succeeded') {
    console.log('✅ Activity: Payment succeeded');
    return true;
  }
  
  console.log('⚠️ Activity: Payment still pending');
  return false;
}

// ─── Send retry notification ──────────────────────────────────
export async function sendRetryNotificationActivity(
  orderId: string,
  email: string,
  attempt: number,
  maxAttempts: number
): Promise<void> {
  console.log('🔧 Activity: Sending retry notification', { 
    orderId, 
    email, 
    attempt, 
    maxAttempts 
  });
  
  // TODO: Integrate with email service
  console.log(`📧 Retry notification sent: Attempt ${attempt}/${maxAttempts} for order ${orderId}`);
  
  console.log('✅ Activity: Retry notification sent');
}