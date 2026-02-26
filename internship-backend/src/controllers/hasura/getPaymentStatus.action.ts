import { Request, Response } from "express";
import OrderModel from "../../models/order.model";
import PaymentModel from "../../models/payment.model";
import { getHasuraSessionUser, requireHasuraActionSecret } from "./helpers";

export const handleGetPaymentStatusAction = async (req: Request, res: Response) => {
  try {
    if (!requireHasuraActionSecret(req)) {
      res.status(401).json({ message: "Unauthorized Hasura action" });
      return;
    }

    const orderId = req.body?.input?.orderId as string | undefined;
    const session = getHasuraSessionUser(req);

    if (!orderId || !session) {
      res.status(400).json({ message: "orderId and a valid user session are required" });
      return;
    }

    const order = await OrderModel.getByOrderId(orderId, session.userId);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const payment = await PaymentModel.getByOrderId(order.id);
    if (!payment) {
      res.status(404).json({ message: "Payment not found" });
      return;
    }

    res.json({
      status: payment.status,
      amount: Number(payment.amount),
      currency: payment.currency,
      provider: payment.provider,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action handling failed";
    console.error("handleGetPaymentStatusAction error:", message);
    res.status(500).json({ message: "Failed to fetch payment status" });
  }
};
