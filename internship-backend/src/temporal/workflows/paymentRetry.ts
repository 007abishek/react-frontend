import { condition, defineSignal, proxyActivities, sleep, setHandler } from "@temporalio/workflow";
import type * as activities from "../activities/order.activities";

const {
  retryPaymentActivity,
  cancelOrderActivity,
  sendRetryNotificationActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
  retry: {
    initialInterval: "1s",
    maximumInterval: "1 minute",
    backoffCoefficient: 2,
    maximumAttempts: 8,
  },
});

export const paymentReceivedSignal = defineSignal<[boolean]>("paymentReceived");

export interface PaymentRetryInput {
  orderId: string;
  email: string;
  maxAttempts?: number;
  retryWaitMinutes?: number;
}

export async function paymentRetryWorkflow(
  input: PaymentRetryInput
): Promise<{ success: boolean; attempts: number }> {
  const maxAttempts = input.maxAttempts ?? 5;
  const retryWaitMinutes = input.retryWaitMinutes ?? 2;

  let paid = false;
  setHandler(paymentReceivedSignal, (received: boolean) => {
    paid = received;
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const statusCheck = await retryPaymentActivity(input.orderId);
    if (statusCheck || paid) {
      return { success: true, attempts: attempt };
    }

    await sendRetryNotificationActivity(input.orderId, input.email, attempt, maxAttempts);

    const gotSignal = await condition(() => paid, `${retryWaitMinutes} minutes`);
    if (gotSignal) {
      return { success: true, attempts: attempt };
    }

    if (attempt < maxAttempts) {
      await sleep("10 seconds");
    }
  }

  await cancelOrderActivity(input.orderId);
  return { success: false, attempts: maxAttempts };
}
