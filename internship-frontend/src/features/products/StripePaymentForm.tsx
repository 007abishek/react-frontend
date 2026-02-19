import { useState } from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const MIN_CARD_PAYMENT_INR = 50;

interface BillingDetails {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

interface CheckoutItem {
  id: number;
  title: string;
  price: number;
  quantity: number;
  thumbnail?: string;
  images?: string[];
}

interface CardOrderPayload {
  items: CheckoutItem[];
  address: BillingDetails;
  total: number;
}

interface StripePaymentFormProps {
  amount?: number;
  orderPayload?: CardOrderPayload;
  billingDetails?: BillingDetails;
  onSuccess: ((orderData: Record<string, unknown>) => void) | (() => void);
  onError: (error: string) => void;
}

export default function StripePaymentForm({
  amount,
  orderPayload,
  billingDetails,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderData, setOrderData] = useState<Record<string, unknown> | null>(null);
  const resolveBilling = (): BillingDetails => ({
    fullName: billingDetails?.fullName || "",
    email: billingDetails?.email || "",
    phone: billingDetails?.phone || "",
    addressLine1: billingDetails?.addressLine1 || "",
    addressLine2: billingDetails?.addressLine2 || "",
    city: billingDetails?.city || "",
    state: billingDetails?.state || "",
    pincode: billingDetails?.pincode || "",
  });
  const emitSuccess = (data: Record<string, unknown>) => {
    if (onSuccess.length === 0) {
      (onSuccess as () => void)();
      return;
    }
    (onSuccess as (orderData: Record<string, unknown>) => void)(data);
  };

  const getJwt = () => localStorage.getItem("jwt");

  const ensureOrder = async () => {
    if (orderData) return orderData;

    const jwt = getJwt();
    if (!jwt) {
      throw new Error("Please login again. Missing auth token.");
    }
    if (!orderPayload) {
      throw new Error("Missing order details for card payment.");
    }

    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        ...orderPayload,
        paymentMethod: "card",
      }),
    });

    const data = (await res.json()) as {
      message?: string;
      order?: Record<string, unknown>;
    };

    if (!res.ok || !data.order) {
      throw new Error(data.message || "Failed to create order");
    }

    setOrderData(data.order);
    return data.order;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError("Stripe is not initialized yet. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError("Card input is not ready. Please refresh and try again.");
      return;
    }

    setIsProcessing(true);

    try {
      const jwt = getJwt();
      if (!jwt) {
        throw new Error("Please login again. Missing auth token.");
      }

      const createdOrder = await ensureOrder();
      const orderId = String(createdOrder.orderId || "");
      if (!orderId) {
        throw new Error("Order ID missing for payment.");
      }
      if (typeof amount !== "number" || Number.isNaN(amount) || amount <= 0) {
        throw new Error("Invalid payment amount.");
      }
      if (amount < MIN_CARD_PAYMENT_INR) {
        throw new Error(
          `Minimum card payment is Rs ${MIN_CARD_PAYMENT_INR.toFixed(2)}.`
        );
      }

      const safeBilling = resolveBilling();

      const intentRes = await fetch(`${API_URL}/payments/stripe/intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          orderId,
          amount,
          currency: "inr",
        }),
      });

      const intentData = (await intentRes.json()) as {
        clientSecret?: string;
        message?: string;
      };

      if (!intentRes.ok || !intentData.clientSecret) {
        throw new Error(intentData.message || "Could not create payment intent");
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: safeBilling.fullName,
              email: safeBilling.email,
              phone: safeBilling.phone,
              address: {
                line1: safeBilling.addressLine1,
                line2: safeBilling.addressLine2 || undefined,
                city: safeBilling.city,
                state: safeBilling.state,
                postal_code: safeBilling.pincode,
                country: "IN",
              },
            },
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Payment failed");
      }

      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        throw new Error("Payment was not completed. Please try again.");
      }

      emitSuccess({
        ...createdOrder,
        paymentMethod: "card",
        paymentIntentId: paymentIntent.id,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment failed. Please try again.";
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-3">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#f8fafc",
                "::placeholder": {
                  color: "#94a3b8",
                },
              },
              invalid: {
                color: "#f87171",
              },
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing || (typeof amount === "number" && amount < MIN_CARD_PAYMENT_INR)}
        className={`w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 py-3 font-semibold text-white shadow-lg transition-all hover:from-green-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${
          isProcessing ? "cursor-wait" : ""
        }`}
      >
        {isProcessing
          ? "Processing Payment..."
          : typeof amount === "number" && amount < MIN_CARD_PAYMENT_INR
            ? `Minimum Rs ${MIN_CARD_PAYMENT_INR.toFixed(2)} required`
            : "Pay Now"}
      </button>
    </form>
  );
}
