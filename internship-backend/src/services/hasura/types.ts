export type EmailLambdaType = "confirmation" | "payment_failed" | "cancellation";

export type LambdaEmailPayload = {
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
};

