import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

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

interface StripePaymentFormProps {
  clientSecret: string;
  amount?: number;
  billingDetails?: BillingDetails;
  existingOrderData?: Record<string, unknown> | null;
  onSuccess: ((orderData: Record<string, unknown>) => void) | (() => void);
  onError: (error: string) => void;
}

export default function StripePaymentForm({
  clientSecret,
  amount,
  billingDetails,
  existingOrderData,
  onSuccess,
  onError,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError("Stripe is not initialized yet. Please try again.");
      return;
    }

    if (!clientSecret) {
      onError("Payment is not initialized. Please go back and try again.");
      return;
    }

    if (typeof amount === "number" && amount < MIN_CARD_PAYMENT_INR) {
      onError(`Minimum card payment is Rs ${MIN_CARD_PAYMENT_INR.toFixed(2)}.`);
      return;
    }

    setIsProcessing(true);

    try {
      const safeBilling = resolveBilling();

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          payment_method_data: {
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
        },
      });

      if (error) {
        throw new Error(error.message || "Payment failed");
      }

      if (!paymentIntent) {
        throw new Error("Payment could not be confirmed. Please try again.");
      }

      if (!["succeeded", "processing", "requires_capture"].includes(paymentIntent.status)) {
        throw new Error(`Payment status is ${paymentIntent.status}. Please try again.`);
      }

      emitSuccess({
        ...(existingOrderData || {}),
        paymentMethod: "card",
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
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
        <PaymentElement
          options={{
            layout: "tabs",
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
