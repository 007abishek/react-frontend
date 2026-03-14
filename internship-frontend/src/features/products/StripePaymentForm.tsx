import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { fetchOrderConfirmationByExternalId } from "./hasuraCommerce";

const MIN_CARD_PAYMENT_INR = 50;
const PAYMENT_CONFIRMATION_TIMEOUT_MS = 60_000;
const PAYMENT_CONFIRMATION_POLL_INTERVAL_MS = 2_000;

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

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForBackendConfirmation = async (orderId: string): Promise<Record<string, unknown>> => {
    const deadline = Date.now() + PAYMENT_CONFIRMATION_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const order = await fetchOrderConfirmationByExternalId(orderId);

      if (order) {
        const orderStatus = String(order.orderStatus ?? "").toLowerCase();
        const paymentStatus = String(order.paymentStatus ?? "").toLowerCase();

        if (
          paymentStatus === "succeeded" &&
          ["confirmed", "processing", "shipped", "delivered"].includes(orderStatus)
        ) {
          return {
            orderId: order.orderId,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus,
          };
        }

        if (["failed", "cancelled"].includes(paymentStatus) || orderStatus === "cancelled") {
          throw new Error("Payment was not confirmed by backend. Please try again.");
        }
      }

      await sleep(PAYMENT_CONFIRMATION_POLL_INTERVAL_MS);
    }

    throw new Error("Payment received but backend confirmation is delayed. Check Order History in a moment.");
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

      const orderId = typeof existingOrderData?.orderId === "string" ? existingOrderData.orderId : "";
      const confirmedOrder = orderId ? await waitForBackendConfirmation(orderId) : null;

      emitSuccess({
        ...(existingOrderData || {}),
        ...(confirmedOrder || {}),
        paymentMethod: "card",
        paymentIntentId: paymentIntent.id,
        paymentStatus: "succeeded",
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
    <form onSubmit={handleSubmit} className="w-full space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing || (typeof amount === "number" && amount < MIN_CARD_PAYMENT_INR)}
        className={`w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 sm:py-3.5 sm:text-base ${isProcessing ? "cursor-wait" : ""}`}
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
