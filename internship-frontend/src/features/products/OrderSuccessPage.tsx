import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { useToast } from "../../components/toast/useToast";
import { invokeEmailLambdaViaAction } from "./hasuraCommerce";

type OrderData = Record<string, unknown>;
type OrderItem = Record<string, unknown>;
type Address = Record<string, unknown>;

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const didToastRef = useRef(false);
  const orderData = (location.state as { orderData?: OrderData } | null)?.orderData ?? null;
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    if (!orderData) {
      navigate("/products");
    }
  }, [orderData, navigate]);

  useEffect(() => {
    if (!orderData) return;
    if (didToastRef.current) return;
    didToastRef.current = true;
    toast.success("Order placed successfully.", "Success");
  }, [orderData, toast]);

  const parsedTotal = Number(orderData?.total ?? orderData?.subtotal ?? 0);
  const safeTotal = Number.isFinite(parsedTotal) ? parsedTotal : 0;
  const orderItems = (Array.isArray(orderData?.items) ? (orderData?.items as OrderItem[]) : []) as OrderItem[];
  const orderDateValue = String(orderData?.orderDate ?? orderData?.created_at ?? new Date().toISOString());
  const paymentMethod = String(orderData?.paymentMethod ?? orderData?.payment_method ?? "").toLowerCase();
  const address = ((orderData?.address ?? {}) as Address) satisfies Address;

  const expectedDeliveryDate = useMemo(() => {
    const baseDate = new Date(orderDateValue);
    const deliveryDate = new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000);
    return deliveryDate.toLocaleDateString();
  }, [orderDateValue]);

  const handleResendEmail = async () => {
    if (!orderData) return;
    const email = String(address["email"] ?? "").trim();
    const orderId = String(orderData["orderId"] ?? "").trim();

    if (!email || !orderId) {
      setEmailMessage("Email address or order id is missing.");
      toast.warning("Email address or order id is missing.", "Email");
      return;
    }

    const orderDateIso = new Date(orderDateValue).toISOString();
    const expectedDeliveryDateIso = new Date(
      new Date(orderDateIso).getTime() + 3 * 24 * 60 * 60 * 1000
    ).toISOString();

    try {
      setIsSendingEmail(true);
      setEmailMessage("");
      await invokeEmailLambdaViaAction({
        type: "confirmation",
        orderId,
        email,
        payload: {
          items: orderItems.map((item) => ({
            title: String(item["title"] ?? "Product"),
            quantity: Number(item["quantity"] ?? 0),
            price: Number(item["price"] ?? 0),
          })),
          total: safeTotal,
          currency: "INR",
          paymentMethod,
          orderDate: orderDateIso,
          expectedDeliveryDate: expectedDeliveryDateIso,
          address: {
            fullName: String(address["fullName"] ?? ""),
            phone: String(address["phone"] ?? ""),
            email,
            addressLine1: String(address["addressLine1"] ?? ""),
            addressLine2: String(address["addressLine2"] ?? ""),
            city: String(address["city"] ?? ""),
            state: String(address["state"] ?? ""),
            pincode: String(address["pincode"] ?? ""),
          },
        },
      });
      setEmailMessage("Confirmation email sent.");
      toast.success("Confirmation email sent.", "Email");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send confirmation email.";
      setEmailMessage(message);
      toast.error(message, "Email");
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (!orderData) return null;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">Order placed successfully</h1>
                <p className="mt-1 text-sm sm:text-base text-[var(--text-secondary)]">
                  Your payment is confirmed and your order is now being prepared.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-300">
              Order Confirmed
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">Order ID</p>
                  <p className="mt-1 break-all font-mono text-lg font-semibold">
                    {String(orderData.orderId ?? "-")}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-[var(--text-secondary)]">Order Date</p>
                  <p className="mt-1 font-medium">{new Date(orderDateValue).toLocaleDateString()}</p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <h2 className="mb-3 text-lg font-semibold">Delivery Address</h2>
              <div className="rounded-xl border border-[color:var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <p className="font-semibold">{String(address.fullName ?? "")}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {String(address.addressLine1 ?? "")}
                  {String(address.addressLine2 ?? "").trim() ? `, ${String(address.addressLine2)}` : ""}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {String(address.city ?? "")}, {String(address.state ?? "")} - {String(address.pincode ?? "")}
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Phone: {String(address.phone ?? "")}</p>
              </div>
            </article>

            <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Order Items</h2>
              <div className="space-y-3">
                {orderItems.map((item: OrderItem, index: number) => (
                  <div
                    key={String(item["id"] ?? item["orderItemId"] ?? item["productId"] ?? `${String(item["title"] ?? "item")}-${index}`)}
                    className="flex items-start gap-3 rounded-xl border border-[color:var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                  >
                    <img
                      src={String(item["thumbnail"] ?? item["image"] ?? "")}
                      alt={String(item["title"] ?? "Product")}
                      className="h-16 w-16 rounded-lg bg-white object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold sm:text-base">{String(item["title"] ?? "Product")}</p>
                      <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                        Quantity: {Number(item["quantity"] ?? 0)}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm font-semibold text-blue-600 dark:text-blue-400 sm:text-base">
                      &#8377;{(Number(item["price"] ?? 0) * Number(item["quantity"] ?? 0)).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <aside className="space-y-6 lg:col-span-4">
            <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6 lg:sticky lg:top-24">
              <h2 className="mb-4 text-lg font-semibold">Payment Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span>&#8377;{safeTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Delivery Charges</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Free</span>
                </div>
                <div className="flex items-center justify-between border-t border-[color:var(--border-subtle)] pt-3 text-base font-semibold sm:text-lg">
                  <span>Total Paid</span>
                  <span className="text-blue-600 dark:text-blue-400">&#8377;{safeTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <span className="text-[var(--text-secondary)]">Payment Method</span>
                  <span className="font-medium capitalize">
                    {paymentMethod === "cod"
                      ? "Cash on Delivery"
                      : paymentMethod === "card"
                      ? "Card Payment"
                      : "UPI Payment"}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Estimated Delivery</p>
                <p className="mt-1 text-sm text-blue-700/90 dark:text-blue-200/90">
                  {expectedDeliveryDate} (5-7 business days)
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <button
                  onClick={() => navigate("/products")}
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 font-semibold text-[var(--text-primary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Go to Home
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-[color:var(--border-subtle)] bg-[var(--bg-surface)] p-5 sm:p-6">
              <p className="text-sm text-[var(--text-secondary)]">
                Confirmation email sent to{" "}
                <span className="font-medium text-[var(--text-primary)]">{String(address["email"] ?? "-")}</span>
              </p>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isSendingEmail}
                className="mt-3 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
              >
                {isSendingEmail ? "Sending..." : "Resend Confirmation Email"}
              </button>
              {emailMessage && <p className="mt-2 text-xs text-[var(--text-secondary)]">{emailMessage}</p>}
            </article>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
