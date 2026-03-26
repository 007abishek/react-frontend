import { sendEmailViaLambdaActivity } from "../../temporal/activities/lambda.activities";
import type { EmailLambdaType, LambdaEmailPayload } from "./types";
//validates input and triggers a temporal activity that sends an email via aws lambda
export async function invokeEmailLambdaFromAction(input: {
  type: EmailLambdaType;
  orderId: string;
  email: string;
  payload: LambdaEmailPayload;
}): Promise<{ success: boolean; message: string }> {
  const type = input.type?.trim() as EmailLambdaType;
  const orderId = input.orderId?.trim();
  const email = input.email?.trim();

  if (!type || !orderId || !email || !input.payload) {
    throw new Error("type, orderId, email and payload are required");
  }

  await sendEmailViaLambdaActivity(type, orderId, email, input.payload);
  return {
    success: true,
    message: "Lambda invoked successfully",
  };
}
