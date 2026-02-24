import { Response } from "express";
import OrderModel from "../models/order.model";
import CartModel from "../models/cart.model";
import PaymentModel from "../models/payment.model";
import { AuthRequest } from "../middleware/auth";
import { startWorkflowIdempotent } from "../temporal/client";

function toPaymentStatus(paymentMethod: string, orderStatus: string, rawPaymentStatus?: string): string {
  const normalizedMethod = paymentMethod.trim().toLowerCase();
  if (normalizedMethod === "cod") return "not_required";

  if (rawPaymentStatus) {
    return rawPaymentStatus;
  }

  const normalizedOrderStatus = orderStatus.trim().toLowerCase();
  if (normalizedOrderStatus === "cancelled") return "cancelled";
  if (
    normalizedOrderStatus === "confirmed" ||
    normalizedOrderStatus === "processing" ||
    normalizedOrderStatus === "shipped" ||
    normalizedOrderStatus === "delivered"
  ) {
    return "succeeded";
  }
  return "pending";
}

// POST /orders (with Temporal workflow)
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const firebaseUid = req.user?.uid!;

    const { items, address, paymentMethod, total, orderId, orderDate } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "items array required" });
      return;
    }

    if (!address || !address.fullName || !address.phone || !address.addressLine1) {
      res.status(400).json({ message: "Complete address required" });
      return;
    }

    if (!paymentMethod) {
      res.status(400).json({ message: "paymentMethod required" });
      return;
    }

    const finalOrderId = orderId || `ORD-${Date.now()}`;

    const orderItems = items.map((item: any) => ({
      productId: item.id,
      title: item.title,
      price: item.price,
      thumbnail: item.thumbnail || item.images?.[0] || "",
      quantity: item.quantity,
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    await OrderModel.create({
      userId,
      firebaseUid,
      orderId: finalOrderId,
      paymentMethod,
      items: orderItems,
      address: {
        fullName: address.fullName,
        phone: address.phone,
        email: address.email,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      subtotal,
      total: total || subtotal,
    });

    const workflowStartMode = (process.env.ORDER_WORKFLOW_START_MODE ?? "api").toLowerCase();
    if (workflowStartMode !== "hasura") {
      try {
        const result = await startWorkflowIdempotent({
          workflowType: "orderPlacementWorkflow",
          workflowId: `order-${finalOrderId}`,
          taskQueue: "ecommerce-orders",
          args: [
            {
              userId,
              orderId: finalOrderId,
              email: address.email,
              paymentMethod,
              amount: Number(total || subtotal),
              items: orderItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
              createOrderInput: {
                userId,
                firebaseUid,
                orderId: finalOrderId,
                paymentMethod,
                items: orderItems,
                address: {
                  fullName: address.fullName,
                  phone: address.phone,
                  email: address.email,
                  addressLine1: address.addressLine1,
                  addressLine2: address.addressLine2 || "",
                  city: address.city,
                  state: address.state,
                  pincode: address.pincode,
                },
                subtotal,
                total: total || subtotal,
              },
            },
          ],
        });
        console.log(
          result.started
            ? `Workflow started: order-${finalOrderId}`
            : `Workflow already running: order-${finalOrderId}`
        );
      } catch (workflowError) {
        const message =
          workflowError instanceof Error ? workflowError.message : String(workflowError);
        console.error("Failed to start workflow:", message);
      }
    }

    await CartModel.clearCart(userId);

    res.status(201).json({
      message: "Order placed successfully",
      order: {
        orderId: finalOrderId,
        orderDate: orderDate || new Date().toISOString(),
        status: "pending",
        orderStatus: "pending",
        paymentStatus: toPaymentStatus(paymentMethod, "pending"),
        items: orderItems,
        address,
        paymentMethod,
        total: total || subtotal,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    console.error("createOrder error:", message);
    res.status(500).json({ message: "Failed to create order" });
  }
};

// GET /orders
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const orders = await OrderModel.getByUserId(userId);
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const payment = await PaymentModel.getByOrderId(order.id);
        return {
          ...order,
          orderStatus: order.status,
          paymentStatus: toPaymentStatus(order.payment_method, order.status, payment?.status),
        };
      })
    );

    res.json({
      orders: enrichedOrders,
      count: enrichedOrders.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch orders";
    console.error("getUserOrders error:", message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// GET /orders/:orderId
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const rawOrderId = req.params.orderId;
    const resolvedOrderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;

    if (!resolvedOrderId) {
      res.status(400).json({ message: "Invalid orderId" });
      return;
    }

    const order = await OrderModel.getByOrderId(resolvedOrderId, userId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const payment = await PaymentModel.getByOrderId(order.id);

    res.json({
      order: {
        ...order,
        orderStatus: order.status,
        paymentStatus: toPaymentStatus(order.payment_method, order.status, payment?.status),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch order";
    console.error("getOrderById error:", message);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};
