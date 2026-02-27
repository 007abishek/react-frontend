import OrderModel from "../../models/order.model";
import { startWorkflowIdempotent } from "../../temporal/client";

export async function processOrderInsertedEvent(orderId: string): Promise<void> {
  const workflowData = await OrderModel.getWorkflowDataByOrderId(orderId);
  if (!workflowData || !Array.isArray(workflowData.items) || workflowData.items.length === 0) {
    throw new Error("Order workflow payload not ready");
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
}
