import { Request, Response } from "express";
import OrderModel from "../../models/order.model";
import { startWorkflowIdempotent } from "../../temporal/client";
import { requireHasuraEventSecret } from "./helpers";

export const handleOrderInsertedEvent = async (req: Request, res: Response) => {
  try {
    if (!requireHasuraEventSecret(req)) {
      res.status(401).json({ message: "Unauthorized Hasura event" });
      return;
    }

    const op = req.body?.event?.op as string | undefined;
    const newRow = req.body?.event?.data?.new as { order_id?: string } | undefined;
    const orderId = newRow?.order_id;

    if (op !== "INSERT" || !orderId) {
      res.status(400).json({ message: "Invalid Hasura order insert event payload" });
      return;
    }

    const workflowData = await OrderModel.getWorkflowDataByOrderId(orderId);
    if (!workflowData || !Array.isArray(workflowData.items) || workflowData.items.length === 0) {
      res.status(500).json({ message: "Order workflow payload not ready" });
      return;
    }

    await startWorkflowIdempotent({
      workflowType: "orderPlacementWorkflow",
      taskQueue: "ecommerce-orders",
      workflowId: `order-${workflowData.order_id}`,
      args: [
        {
          userId: workflowData.user_id,
          orderId: workflowData.order_id,
          email: workflowData.email ?? "",
          paymentMethod: workflowData.payment_method,
          orderDate: workflowData.created_at
            ? new Date(workflowData.created_at).toISOString()
            : undefined,
          amount: Number(workflowData.total),
          items: workflowData.items.map((item: any) => ({
            productId: item.product_id,
            quantity: item.quantity,
          })),
          createOrderInput: {
            userId: workflowData.user_id,
            firebaseUid: workflowData.firebase_uid,
            orderId: workflowData.order_id,
            paymentMethod: workflowData.payment_method,
            items: workflowData.items.map((item: any) => ({
              productId: item.product_id,
              title: item.title,
              price: Number(item.price),
              thumbnail: item.thumbnail ?? "",
              quantity: item.quantity,
            })),
            address: {
              fullName: workflowData.full_name ?? "",
              phone: workflowData.phone ?? "",
              email: workflowData.email ?? "",
              addressLine1: workflowData.address_line1 ?? "",
              addressLine2: workflowData.address_line2 ?? "",
              city: workflowData.city ?? "",
              state: workflowData.state ?? "",
              pincode: workflowData.pincode ?? "",
            },
            subtotal: Number(workflowData.subtotal),
            total: Number(workflowData.total),
          },
        },
      ],
    });

    res.json({ received: true, orderId: workflowData.order_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hasura event handling failed";
    console.error("handleOrderInsertedEvent error:", message);
    res.status(500).json({ message: "Hasura event handling failed" });
  }
};
