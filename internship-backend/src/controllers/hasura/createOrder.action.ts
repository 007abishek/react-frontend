import { Request, Response } from "express";
import CartModel from "../../models/cart.model";
import OrderModel from "../../models/order.model";
import {
  getHasuraSessionUser,
  requireHasuraActionSecret,
  toPaymentStatus,
} from "./helpers";

export const handleCreateOrderAction = async (req: Request, res: Response) => {
  try {
    if (!requireHasuraActionSecret(req)) {
      res.status(401).json({ message: "Unauthorized Hasura action" });
      return;
    }

    const session = getHasuraSessionUser(req);
    if (!session) {
      res.status(400).json({ message: "A valid Hasura user session is required" });
      return;
    }

    const items = req.body?.input?.items as Array<{
      productId: number;
      title: string;
      price: number;
      thumbnail?: string;
      quantity: number;
    }> | undefined;
    const address = req.body?.input?.address as {
      fullName: string;
      phone: string;
      email: string;
      addressLine1: string;
      addressLine2?: string | null;
      city: string;
      state: string;
      pincode: string;
    } | undefined;
    const paymentMethod = req.body?.input?.paymentMethod as string | undefined;
    const total = Number(req.body?.input?.total ?? 0);
    const providedOrderId = req.body?.input?.orderId as string | undefined;
    const providedOrderDate = req.body?.input?.orderDate as string | undefined;

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

    const finalOrderId = providedOrderId || `ORD-${Date.now()}`;
    const orderItems = items.map((item) => ({
      productId: Number(item.productId),
      title: item.title,
      price: Number(item.price),
      thumbnail: item.thumbnail || "",
      quantity: Number(item.quantity),
    }));

    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const finalTotal = Number.isFinite(total) && total > 0 ? total : subtotal;

    await OrderModel.create({
      userId: session.userId,
      firebaseUid: session.firebaseUid,
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
      total: finalTotal,
    });

    await CartModel.clearCart(session.userId);

    res.status(201).json({
      orderId: finalOrderId,
      orderDate: providedOrderDate || new Date().toISOString(),
      status: "pending",
      orderStatus: "pending",
      paymentStatus: toPaymentStatus(paymentMethod, "pending"),
      paymentMethod,
      total: finalTotal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action handling failed";
    console.error("handleCreateOrderAction error:", message);
    res.status(500).json({ message: "Failed to create order" });
  }
};
