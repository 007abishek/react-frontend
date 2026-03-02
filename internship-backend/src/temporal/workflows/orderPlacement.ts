import {
  ApplicationFailure,
  CancellationScope,
  ParentClosePolicy,
  condition,
  defineSignal,
  proxyActivities,
  rootCause,
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
    maximumInterval: "1 minute",
    backoffCoefficient: 2,
    maximumAttempts: 8,
  },
});

const { sendEmailViaLambdaActivity } = proxyActivities<typeof lambdaActivities>({
  startToCloseTimeout: "2 minutes",
  retry: {
    initialInterval: "5s",
    maximumInterval: "5 minutes",
    backoffCoefficient: 2,
    maximumAttempts: 6,
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
  taskQueue?: string;
  items: Array<{ productId: number; quantity: number }>;
  createOrderInput: CreateOrderInput;
}

function isBusinessFailure(error: unknown): boolean {
  const root = rootCause(error);
  const message = typeof root === "string" ? root.toLowerCase() : String(root).toLowerCase();

  return (
    message.includes("payment timeout") ||
    message.includes("insufficient stock") ||
    message.includes("invalid quantity") ||
    message.includes("invalid product") ||
    message.includes("items array required") ||
    message.includes("complete address required") ||
    message.includes("paymentmethod required")
  );
}

function getRootErrorMessage(error: unknown): string {
  const root = rootCause(error);
  return typeof root === "string" && root.trim() ? root : "Order workflow failed";
}

export async function orderPlacementWorkflow(
  input: OrderPlacementInput
): Promise<{ success: boolean; status: string; orderId: string }> {
  let paymentReceived = false;
  let reservationIds: number[] = [];
  let inventoryReleaseScope: CancellationScope | null = null;
  let inventoryReleasePromise: Promise<unknown> | null = null;
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
    reservationIds = await reserveInventoryActivity(input.userId, input.items, input.orderId);

    // Fire inventory release timeout workflow (5 min)
    inventoryReleaseScope = new CancellationScope();
    inventoryReleasePromise = inventoryReleaseScope.run(async () => {
      const child = await startChild(inventoryReleaseWorkflow, {
        workflowId: `inventory-release-${input.orderId}`,
        taskQueue: input.taskQueue || "ecommerce-orders",
        parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_REQUEST_CANCEL,
        args: [
          {
            reservationIds,
            orderId: input.orderId,
            waitMinutes: 5,
          },
        ],
      });
      return child.result();
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

    if (inventoryReleaseScope && inventoryReleasePromise) {
      // Child is only a timeout safety net; cancel once order is finalized.
      inventoryReleaseScope.cancel();
      try {
        await inventoryReleasePromise;
      } catch {
        // Expected when canceled; ignore.
      }
    }

    return { success: true, status: "confirmed", orderId: input.orderId };
  } catch (error) {
    const businessFailure = isBusinessFailure(error);
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

    if (inventoryReleaseScope && inventoryReleasePromise) {
      inventoryReleaseScope.cancel();
      try {
        await inventoryReleasePromise;
      } catch {
        // Expected when canceled; ignore.
      }
    }

    if (businessFailure) {
      return { success: false, status: "cancelled", orderId: input.orderId };
    }

    throw ApplicationFailure.retryable(
      getRootErrorMessage(error),
      "TransientOrderWorkflowFailure"
    );
  }
}
