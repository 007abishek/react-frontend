import { Request, Response } from "express";
import { HasuraActionRequest } from "../../middleware/hasura";
import { createOrderFromActionInput } from "../../services/hasura/order.service";

type CreateOrderAddressInput = {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
};

export const handleCreateOrderAction = async (req: Request, res: Response) => {
  try {
    const actionReq = req as HasuraActionRequest;
    const session = actionReq.hasuraUser;
    if (!session) {
      res.status(400).json({ message: "A valid Hasura user session is required" });
      return;
    }

    const items = req.body?.input?.items as Array<{
      productId: number;
      quantity: number;
    }> | undefined;
    const rawAddress = req.body?.input?.address as Partial<CreateOrderAddressInput> | undefined;
    const address: CreateOrderAddressInput = {
      fullName: String(rawAddress?.fullName ?? ""),
      phone: String(rawAddress?.phone ?? ""),
      email: String(rawAddress?.email ?? ""),
      addressLine1: String(rawAddress?.addressLine1 ?? ""),
      addressLine2:
        rawAddress?.addressLine2 == null ? "" : String(rawAddress.addressLine2),
      city: String(rawAddress?.city ?? ""),
      state: String(rawAddress?.state ?? ""),
      pincode: String(rawAddress?.pincode ?? ""),
    };
    const paymentMethod = req.body?.input?.paymentMethod as string | undefined;
    const total = Number(req.body?.input?.total ?? 0);
    const providedOrderId = req.body?.input?.orderId as string | undefined;
    const providedOrderDate = req.body?.input?.orderDate as string | undefined;

    const result = await createOrderFromActionInput(session, {
      items: items ?? [],
      address,
      paymentMethod: paymentMethod ?? "",
      total,
      orderId: providedOrderId,
      orderDate: providedOrderDate,
    });

    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action handling failed";
    console.error("handleCreateOrderAction error:", message);

    const isBadRequestError =
      message === "items array required" ||
      message === "Complete address required" ||
      message === "paymentMethod required" ||
      message === "Invalid product in order" ||
      message === "Invalid quantity in order";

    const isStockOrAvailabilityError =
      message.startsWith("Insufficient stock") ||
      message === "One or more products are unavailable";

    if (message === "Checkout attempt data changed for the same orderId") {
      res.status(409).json({ message });
      return;
    }

    if (isBadRequestError) {
      res.status(400).json({ message });
      return;
    }

    if (isStockOrAvailabilityError) {
      res.status(409).json({ message });
      return;
    }

    res.status(500).json({ message: "Failed to create order" });
  }
};
