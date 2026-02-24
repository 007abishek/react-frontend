import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

export interface LambdaEmailPayload {
  items: Array<{ title: string; quantity: number; price: number }>;
  total: number;
  currency?: string;
  paymentMethod?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  address?: {
    fullName?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

export async function sendEmailViaLambdaActivity(
  type: "confirmation" | "payment_failed" | "cancellation",
  orderId: string,
  email: string,
  payload: LambdaEmailPayload
): Promise<void> {
  const functionName = process.env.EMAIL_LAMBDA_FUNCTION_NAME;
  if (!functionName) {
    throw new Error("EMAIL_LAMBDA_FUNCTION_NAME is not configured");
  }

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(
      JSON.stringify({
        type,
        orderId,
        email,
        payload,
      })
    ),
  });

  const response = await lambdaClient.send(command);

  if (response.FunctionError) {
    const details = response.Payload
      ? Buffer.from(response.Payload).toString("utf-8")
      : response.FunctionError;
    throw new Error(`Lambda function error: ${details}`);
  }

  if (response.Payload) {
    const raw = Buffer.from(response.Payload).toString("utf-8");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          statusCode?: number;
          success?: boolean;
          error?: string;
          message?: string;
        };
        if (
          (typeof parsed.statusCode === "number" && parsed.statusCode >= 400) ||
          parsed.success === false ||
          parsed.error
        ) {
          throw new Error(parsed.error || parsed.message || "Lambda returned unsuccessful payload");
        }
      } catch (err) {
        if (!(err instanceof SyntaxError)) {
          throw err;
        }
      }
    }
  }
}
