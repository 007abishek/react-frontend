import { hasuraRequest } from "../../../utils/hasuraClient";
import type { InvokeEmailLambdaPayload, InvokeEmailLambdaType } from "./types";

export async function invokeEmailLambdaViaAction(input: {
  type: InvokeEmailLambdaType;
  orderId: string;
  email: string;
  payload: InvokeEmailLambdaPayload;
}): Promise<{ success: boolean; message: string }> {
  const data = await hasuraRequest<{
    invokeEmailLambda: {
      success: boolean;
      message: string;
    };
  }>(
    `
      mutation InvokeEmailLambda(
        $type: String!
        $orderId: String!
        $email: String!
        $payload: jsonb!
      ) {
        invokeEmailLambda(type: $type, orderId: $orderId, email: $email, payload: $payload) {
          success
          message
        }
      }
    `,
    input
  );

  return data.invokeEmailLambda;
}
