import {
  ParentClosePolicy,
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
  startChild,
} from "@temporalio/workflow";
import type * as activities from "../activities/order.activities";
import type * as lambdaActivities from "../activities/lambda.activities";
import type { CreateOrderInput } from "../../models/order.model";
import { inventoryReleaseWorkflow } from "./inventoryRelease";

const {
  validateInventoryActivity,
  reserveInventoryActivity,
  createOrderActivity,
  initiatePaymentActivity,
  confirmInventoryActivity,
  releaseInventoryActivity,
  confirmOrderActivity,
  rollbackOrderActivity,
  updatePaymentStatusByOrderActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "1 minute",
  retry: {
    initialInterval: "1s",
    maximumInterval: "30s",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

const { sendEmailViaLambdaActivity } = proxyActivities<typeof lambdaActivities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    initialInterval: "2s",
    maximumInterval: "1 minute",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export const paymentCompletedSignal = defineSignal<[boolean]>("paymentCompleted");

export interface OrderPlacementInput {
  userId: number;
  orderId: string;
  email: string;
  paymentMethod: string;
  orderDate?: string;
  amount: number;
  items: Array<{ productId: number; quantity: number }>;
  createOrderInput: CreateOrderInput;
}

export async function orderPlacementWorkflow(
  input: OrderPlacementInput
): Promise<{ success: boolean; status: string; orderId: string }> {
  let paymentReceived = false;
  let reservationIds: number[] = [];
  const orderDate = input.orderDate || new Date().toISOString();
  const expectedDeliveryDate = new Date(
    new Date(orderDate).getTime() + 3 * 24 * 60 * 60 * 1000
  ).toISOString();
  const emailPayload = {
    items: input.createOrderInput.items.map((i) => ({
      title: i.title || "Product",
      quantity: i.quantity,
      price: i.price || 0,
    })),
    total: input.createOrderInput.total || 0,
    currency: "INR",
    paymentMethod: input.paymentMethod,
    orderDate,
    expectedDeliveryDate,
    address: input.createOrderInput.address,
  };

  setHandler(paymentCompletedSignal, (received: boolean) => {
    paymentReceived = received;
  });

  try {
    // Activity: validateInventory()
    await validateInventoryActivity(input.items);

    // Activity: reserveInventory()
    reservationIds = await reserveInventoryActivity(input.userId, input.items);

    // Fire inventory release timeout workflow (5 min)
    await startChild(inventoryReleaseWorkflow, {
      workflowId: `inventory-release-${input.orderId}`,
      taskQueue: "ecommerce-orders",
      parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_REQUEST_CANCEL,
      args: [
        {
          reservationIds,
          orderId: input.orderId,
          waitMinutes: 5,
        },
      ],
    });

    // Activity: createOrder()
    await createOrderActivity(input.createOrderInput);

    // Activity: initiatePayment()
    await initiatePaymentActivity({
      orderId: input.orderId,
      userId: input.userId,
      amount: input.amount,
      currency: "inr",
      paymentMethod: input.paymentMethod,
    });

    const method = input.paymentMethod.trim().toLowerCase();
    if (method === "cod") {
      paymentReceived = true;
    } else {
      const completed = await condition(() => paymentReceived, "5 minutes");
      if (!completed) {
        throw new Error("Payment timeout after 5 minutes");
      }
    }

    // Activity: confirmOrder()
    await confirmInventoryActivity(reservationIds);
    await confirmOrderActivity(input.orderId);
    if (input.paymentMethod.trim().toLowerCase() === "cod") {
      await updatePaymentStatusByOrderActivity(input.orderId, "succeeded");
    }

    try {
      await sendEmailViaLambdaActivity("confirmation", input.orderId, input.email, emailPayload);
    } catch {
      // Keep order confirmed even if email fails.
    }

    return { success: true, status: "confirmed", orderId: input.orderId };
  } catch (error) {
    if (reservationIds.length > 0) {
      await releaseInventoryActivity(reservationIds);
    }

    // Activity: rollback()
    await rollbackOrderActivity(input.orderId);
    await updatePaymentStatusByOrderActivity(input.orderId, "cancelled");
    try {
      await sendEmailViaLambdaActivity("payment_failed", input.orderId, input.email, emailPayload);
    } catch {
      // Keep workflow deterministic even if email fails.
    }

    return { success: false, status: "cancelled", orderId: input.orderId };
  }
}
