import { Request, Response } from "express";
import { HasuraActionRequest } from "../../middleware/hasura";
import { getPaymentStatusForOrder } from "../../services/hasura/payment.service";

export const handleGetPaymentStatusAction = async (req: Request, res: Response) => {
  try {
    const orderId = req.body?.input?.orderId as string | undefined;
    const actionReq = req as HasuraActionRequest;
    const session = actionReq.hasuraUser;

    if (!orderId || !session) {
      res.status(400).json({ message: "orderId and a valid user session are required" });
      return;
    }

    const result = await getPaymentStatusForOrder(orderId, session.userId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action handling failed";
    console.error("handleGetPaymentStatusAction error:", message);
    if (message === "Order not found" || message === "Payment not found") {
      res.status(404).json({ message });
      return;
    }
    res.status(500).json({ message: "Failed to fetch payment status" });
  }
};
