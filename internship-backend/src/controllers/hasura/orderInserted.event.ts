import { Request, Response } from "express";
import { processOrderInsertedEvent } from "../../services/hasura/event.service";

export const handleOrderInsertedEvent = async (req: Request, res: Response) => {
  try {
    const op = req.body?.event?.op as string | undefined;
    const newRow = req.body?.event?.data?.new as { order_id?: string } | undefined;
    const orderId = newRow?.order_id;

    if (op !== "INSERT" || !orderId) {
      res.status(400).json({ message: "Invalid Hasura order insert event payload" });
      return;
    }

    await processOrderInsertedEvent(orderId);
    res.json({ received: true, orderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hasura event handling failed";
    console.error("handleOrderInsertedEvent error:", message);
    res.status(500).json({ message: "Hasura event handling failed" });
  }
};
