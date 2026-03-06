import type { Product } from "../types";
import type { CartItem } from "../cartSlice";

export type ProductRow = Product;

export type CartItemRow = {
  id: number;
  product_id: number;
  title: string;
  price: number;
  thumbnail: string;
  images: string[];
  quantity: number;
};

export type PaymentStatus =
  | "not_required"
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export type OrderSummary = {
  id: number;
  order_id: string;
  status: string;
  payment_method: string;
  payment_status: PaymentStatus;
  total: number;
  created_at: string;
};

export type OrderSummaryRow = Omit<OrderSummary, "payment_status">;

export type OrderItem = {
  id: number;
  product_id: number;
  title: string;
  price: number;
  thumbnail: string;
  quantity: number;
};

export type ShippingAddress = {
  full_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
};

export type CheckoutAddressInput = {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
};

export type CheckoutOrderInput = {
  items: CartItem[];
  address: CheckoutAddressInput;
  paymentMethod: "cod" | "card";
  total: number;
  orderId?: string;
  orderDate?: string;
};

export type InvokeEmailLambdaType = "confirmation" | "payment_failed" | "cancellation";

export type InvokeEmailLambdaPayload = {
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
