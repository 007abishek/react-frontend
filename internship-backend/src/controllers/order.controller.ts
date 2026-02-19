import { Response } from "express";
import OrderModel from "../models/order.model";
import InventoryModel from "../models/inventory.model";
import CartModel from "../models/cart.model";
import { AuthRequest } from "../middleware/auth";

// ─── POST /orders ─────────────────────────────────────────────
// Place order - matches frontend CheckoutPage contract
// ─────────────────────────────────────────────────────────────
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId      = req.user?.userId!;
    const firebaseUid = req.user?.uid!;
    
    const { items, address, paymentMethod, total, orderId, orderDate } = req.body;

    // Validate required fields
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

    // Generate orderId if not provided by frontend
    const finalOrderId = orderId || `ORD-${Date.now()}`;

    // Map frontend cart items to order items format
    const orderItems = items.map((item: any) => ({
      productId: item.id,        // frontend sends id
      title:     item.title,
      price:     item.price,
      thumbnail: item.thumbnail || item.images?.[0] || "",
      quantity:  item.quantity,
    }));

    // Calculate totals
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Reserve inventory
    const reserveItems = orderItems.map(item => ({
      productId: item.productId,
      quantity:  item.quantity,
    }));

    const reservation = await InventoryModel.reserve(userId, reserveItems);

    if (!reservation.success) {
      res.status(409).json({ 
        message: reservation.error || "Unable to reserve inventory" 
      });
      return;
    }

    // Create order in database
    const order = await OrderModel.create({
      userId,
      firebaseUid,
      orderId:       finalOrderId,
      paymentMethod,
      items:         orderItems,
      address: {
        fullName:     address.fullName,
        phone:        address.phone,
        email:        address.email,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        city:         address.city,
        state:        address.state,
        pincode:      address.pincode,
      },
      subtotal,
      total: total || subtotal,
    });

    // For COD, confirm reservation immediately
    if (paymentMethod === "cod") {
      const reservationIds = reservation.reservations!.map(r => r.id);
      await InventoryModel.confirm(reservationIds);
      await OrderModel.updateStatus(finalOrderId, "confirmed");
    }

    // Clear user's cart after successful order
    await CartModel.clearCart(userId);

    // Return order data matching frontend expectation
    res.status(201).json({
      message: "Order placed successfully",
      order: {
        orderId:       finalOrderId,
        orderDate:     orderDate || new Date().toISOString(),
        status:        paymentMethod === "cod" ? "confirmed" : "pending",
        items:         orderItems,
        address,
        paymentMethod,
        total:         total || subtotal,
      },
      reservations: paymentMethod !== "cod" ? reservation.reservations : null,
    });

  } catch (err: any) {
    console.error("createOrder error:", err.message);
    res.status(500).json({ message: "Failed to create order" });
  }
};

// ─── GET /orders ──────────────────────────────────────────────
// Get user's order history
// ─────────────────────────────────────────────────────────────
export const getUserOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId!;
    const orders = await OrderModel.getByUserId(userId);

    res.json({
      orders,
      count: orders.length,
    });

  } catch (err: any) {
    console.error("getUserOrders error:", err.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// ─── GET /orders/:orderId ─────────────────────────────────────
// Get single order details
// ─────────────────────────────────────────────────────────────
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const userId  = req.user?.userId!;
    const rawOrderId = req.params.orderId;

    const orderId=Array.isArray(rawOrderId)
        ? rawOrderId[0]
        : rawOrderId;
    const order=await OrderModel.getByOrderId(orderId,userId);

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    res.json({ order });

  } catch (err: any) {
    console.error("getOrderById error:", err.message);
    res.status(500).json({ message: "Failed to fetch order" });
  }
};