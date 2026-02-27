import { Request, Response } from "express";
import { invokeEmailLambdaFromAction } from "../../services/hasura/lambda.service";
import type { LambdaEmailPayload } from "../../temporal/activities/lambda.activities";

type EmailLambdaType = "confirmation" | "payment_failed" | "cancellation";

function isEmailLambdaType(value: unknown): value is EmailLambdaType {
  return value === "confirmation" || value === "payment_failed" || value === "cancellation";
}

export const handleInvokeEmailLambdaAction = async (req: Request, res: Response) => {
  try {
    const rawType = req.body?.input?.type as string | undefined;
    if (!isEmailLambdaType(rawType)) {
      res.status(400).json({
        message: "Invalid type. Allowed values: confirmation, payment_failed, cancellation",
      });
      return;
    }

    const orderId = req.body?.input?.orderId as string | undefined;
    const email = req.body?.input?.email as string | undefined;
    const payload = req.body?.input?.payload as unknown;
    if (!payload || typeof payload !== "object") {
      res.status(400).json({ message: "payload object is required" });
      return;
    }

    const result = await invokeEmailLambdaFromAction({
      type: rawType,
      orderId: orderId ?? "",
      email: email ?? "",
      payload: payload as LambdaEmailPayload,
    });
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action handling failed";
    console.error("handleInvokeEmailLambdaAction error:", message);
    if (message === "type, orderId, email and payload are required") {
      res.status(400).json({ message });
      return;
    }
    res.status(500).json({ message: "Failed to invoke email lambda" });
  }
};
