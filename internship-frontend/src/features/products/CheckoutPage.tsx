import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import StripePaymentForm from "./StripePaymentForm";
import { clearCart } from "./cartSlice";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const MIN_CARD_PAYMENT_INR = 50;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);

  const [step, setStep] = useState<"address" | "payment" | "review">("address");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card" | "upi">("cod");
  const [paymentError, setPaymentError] = useState("");

  const [address, setAddress] = useState({
    fullName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [upiDetails, setUpiDetails] = useState({
    upiId: "",
  });

  const calculateTotal = () =>
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const handleContinueToReview = () => {
    if (paymentMethod === "upi" && !upiDetails.upiId.trim()) {
      setPaymentError("Please enter a valid UPI ID.");
      return;
    }
    setPaymentError("");
    setStep("review");
  };

  const finishOrder = (orderData: Record<string, unknown>) => {
    dispatch(clearCart());
    navigate("/order-success", { state: { orderData } });
  };

  const createOrder = async () => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
      throw new Error("Please login again. Missing auth token.");
    }

    const orderPayload = {
      items: cartItems,
      address,
      paymentMethod,
      ...(paymentMethod === "upi" ? { upiDetails } : {}),
      total: calculateTotal(),
      orderId: `ORD-${Date.now()}`,
      orderDate: new Date().toISOString(),
    };

    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const data = (await res.json()) as {
      message?: string;
      order?: Record<string, unknown>;
    };

    if (!res.ok || !data.order) {
      throw new Error(data.message || "Failed to place order");
    }

    return data.order;
  };

  const handlePlaceOrder = async () => {
    try {
      setPaymentError("");
      const order = await createOrder();
      finishOrder(order);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to place order. Please try again.";
      setPaymentError(message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  step === "address" ? "bg-blue-600 text-white" : "bg-green-600 text-white"
                }`}
              >
                1
              </div>
              <span
                className={`ml-2 ${step === "address" ? "text-blue-400" : "text-green-400"}`}
              >
                Address
              </span>
            </div>

            <div className="h-1 w-16 bg-slate-700"></div>

            <div className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  step === "payment"
                    ? "bg-blue-600 text-white"
                    : step === "review"
                      ? "bg-green-600 text-white"
                      : "bg-slate-700 text-gray-400"
                }`}
              >
                2
              </div>
              <span
                className={`ml-2 ${
                  step === "payment"
                    ? "text-blue-400"
                    : step === "review"
                      ? "text-green-400"
                      : "text-gray-400"
                }`}
              >
                Payment
              </span>
            </div>

            <div className="h-1 w-16 bg-slate-700"></div>

            <div className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  step === "review" ? "bg-blue-600 text-white" : "bg-slate-700 text-gray-400"
                }`}
              >
                3
              </div>
              <span className={`ml-2 ${step === "review" ? "text-blue-400" : "text-gray-400"}`}>
                Review
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {step === "address" && (
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-lg">
                <h2 className="mb-6 text-2xl font-bold text-white">Shipping Address</h2>
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={address.fullName}
                      onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      required
                      value={address.phone}
                      onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={address.email}
                    onChange={(e) => setAddress({ ...address, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    placeholder="Address Line 1"
                    required
                    value={address.addressLine1}
                    onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    placeholder="Address Line 2 (Optional)"
                    value={address.addressLine2}
                    onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <input
                      type="text"
                      placeholder="City"
                      required
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      required
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      required
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700"
                  >
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {step === "payment" && (
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-lg">
                <h2 className="mb-6 text-2xl font-bold text-white">Payment Method</h2>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-700 p-4 transition hover:bg-slate-600">
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value as "cod");
                          setPaymentError("");
                        }}
                        className="h-5 w-5"
                      />
                      <span className="font-semibold text-white">Cash on Delivery</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-700 p-4 transition hover:bg-slate-600">
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value as "card");
                          setPaymentError("");
                        }}
                        className="h-5 w-5"
                      />
                      <span className="font-semibold text-white">Credit/Debit Card</span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-700 p-4 transition hover:bg-slate-600">
                      <input
                        type="radio"
                        name="payment"
                        value="upi"
                        checked={paymentMethod === "upi"}
                        onChange={(e) => {
                          setPaymentMethod(e.target.value as "upi");
                          setPaymentError("");
                        }}
                        className="h-5 w-5"
                      />
                      <span className="font-semibold text-white">UPI Payment</span>
                    </label>
                  </div>

                  {paymentMethod === "card" && (
                    <div className="space-y-4 pt-4">
                      <div className="rounded-lg border border-blue-700 bg-blue-900/30 p-4">
                        <p className="text-sm text-blue-300">Secure payment powered by Stripe.</p>
                      </div>
                      {calculateTotal() < MIN_CARD_PAYMENT_INR && (
                        <p className="rounded-lg border border-amber-700 bg-amber-900/30 p-3 text-sm text-amber-300">
                          Card payments require a minimum order value of Rs{" "}
                          {MIN_CARD_PAYMENT_INR.toFixed(2)}.
                        </p>
                      )}
                      <StripePaymentForm
                        amount={calculateTotal()}
                        orderPayload={{
                          items: cartItems,
                          address,
                          total: calculateTotal(),
                        }}
                        billingDetails={address}
                        onSuccess={(orderData) => {
                          setPaymentError("");
                          finishOrder(orderData);
                        }}
                        onError={(error) => setPaymentError(error)}
                      />
                    </div>
                  )}

                  {paymentMethod === "upi" && (
                    <div className="space-y-4 pt-4">
                      <div className="mb-4 rounded-lg border border-blue-700 bg-blue-900/30 p-4">
                        <p className="text-sm text-blue-300">
                          Enter your UPI ID to complete the payment
                        </p>
                      </div>
                      <input
                        type="text"
                        placeholder="UPI ID (e.g., yourname@paytm)"
                        value={upiDetails.upiId}
                        onChange={(e) => setUpiDetails({ ...upiDetails, upiId: e.target.value })}
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-400">
                        Supported UPI apps: Google Pay, PhonePe, Paytm, BHIM, etc.
                      </p>
                    </div>
                  )}

                  {paymentError && (
                    <p className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300">
                      {paymentError}
                    </p>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep("address")}
                      className="flex-1 rounded-lg bg-slate-700 py-3 font-semibold text-white transition hover:bg-slate-600"
                    >
                      Back
                    </button>
                    {paymentMethod !== "card" && (
                      <button
                        type="button"
                        onClick={handleContinueToReview}
                        className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700"
                      >
                        Review Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === "review" && (
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-lg">
                <h2 className="mb-6 text-2xl font-bold text-white">Review Your Order</h2>

                <div className="mb-6 rounded-lg bg-slate-700 p-4">
                  <h3 className="mb-2 font-semibold text-white">Shipping Address</h3>
                  <p className="text-sm text-gray-300">
                    {address.fullName}
                    <br />
                    {address.addressLine1}
                    {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                    <br />
                    {address.city}, {address.state} - {address.pincode}
                    <br />
                    Phone: {address.phone}
                    <br />
                    Email: {address.email}
                  </p>
                  <button
                    onClick={() => setStep("address")}
                    className="mt-2 text-sm text-blue-400 hover:underline"
                  >
                    Edit Address
                  </button>
                </div>

                <div className="mb-6 rounded-lg bg-slate-700 p-4">
                  <h3 className="mb-2 font-semibold text-white">Payment Method</h3>
                  <p className="text-sm text-gray-300">
                    {paymentMethod === "cod" && "Cash on Delivery"}
                    {paymentMethod === "upi" && (
                      <>
                        UPI Payment
                        <br />
                        <span className="text-blue-400">UPI ID: {upiDetails.upiId}</span>
                      </>
                    )}
                  </p>
                  <button
                    onClick={() => setStep("payment")}
                    className="mt-2 text-sm text-blue-400 hover:underline"
                  >
                    Change Payment
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("payment")}
                    className="flex-1 rounded-lg bg-slate-700 py-3 font-semibold text-white transition hover:bg-slate-600"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    className="flex-1 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 py-3 font-semibold text-white shadow-lg transition-all hover:from-green-700 hover:to-emerald-700"
                  >
                    Place Order
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-lg">
              <h3 className="mb-4 text-xl font-bold text-white">Order Summary</h3>

              <div className="mb-4 space-y-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.images?.[0] || item.thumbnail}
                      alt={item.title}
                      className="h-16 w-16 rounded bg-white object-contain"
                    />
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm text-white">{item.title}</p>
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <div className="font-semibold text-blue-400">
                      Rs {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-slate-700 pt-4">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>Rs {calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between border-t border-slate-700 pt-2 text-xl font-bold text-white">
                  <span>Total</span>
                  <span className="text-blue-400">Rs {calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
