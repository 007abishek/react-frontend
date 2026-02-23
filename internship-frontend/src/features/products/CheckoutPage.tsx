import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { clearCart } from "./cartSlice";
import StripePaymentForm from "./StripePaymentForm";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);
const hasStripeKey = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);

  const [step, setStep] = useState<"address" | "payment" | "review" | "stripe">("address");
  
  // Loading & Error States
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState("");

  // Order & Payment State
  const [orderId, setOrderId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [createdOrderData, setCreatedOrderData] = useState<Record<string, unknown> | null>(null);

  // Address State
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

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card" | "upi">("cod");
 
  
  

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep("payment");
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep("review");
  };

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    setError("");

    const orderData = {
      items: cartItems,
      address,
      paymentMethod,
    
      
      total: calculateTotal(),
      orderId: `ORD-${Date.now()}`,
      orderDate: new Date().toISOString(),
    };

    try {
      const jwt = localStorage.getItem("jwt");
      
      if (!jwt) {
        setError("Please login to place order");
        setIsPlacing(false);
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
      
      // Step 1: Create Order
      const orderRes = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jwt}`,
        },
        body: JSON.stringify(orderData),
      });

      if (!orderRes.ok) {
        const errorData = await orderRes.json();
        setError(errorData.message || "Failed to place order");
        setIsPlacing(false);
        return;
      }

      const orderResult = await orderRes.json();
      const createdOrderId = orderResult.order.orderId;
      setOrderId(createdOrderId);
      setCreatedOrderData(orderResult.order);

      // Step 2: Handle Payment Based on Method
      if (paymentMethod === "cod") {
        // COD: Order is already confirmed by backend
        dispatch(clearCart());
        navigate("/order-success", { state: { orderData: orderResult.order } });
      } else if (paymentMethod === "card") {
        if (!hasStripeKey) {
          setError("Stripe publishable key is missing. Set VITE_STRIPE_PUBLISHABLE_KEY in frontend .env.");
          setIsPlacing(false);
          return;
        }

        // Card: Create Stripe Payment Intent
        const paymentRes = await fetch(`${API_URL}/payments/stripe/intent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            orderId: createdOrderId,
            amount: calculateTotal(),
            currency: "inr",
          }),
        });

        if (!paymentRes.ok) {
          const errorData = await paymentRes.json();
          setError(errorData.message || "Failed to initialize payment");
          setIsPlacing(false);
          return;
        }

        const paymentResult = await paymentRes.json();
        setClientSecret(paymentResult.clientSecret);
        setIsPlacing(false);
        setStep("stripe"); // Move to Stripe payment form
      } else if (paymentMethod === "upi") {
        // UPI: For now, treat as pending (you can add UPI gateway later)
        setError("UPI payment coming soon. Please use Card or COD.");
        setIsPlacing(false);
      }
      
    } catch (err: any) {
      console.error("Order placement failed:", err);
      setError("Failed to place order. Please check your connection and try again.");
      setIsPlacing(false);
    }
  };

  const handlePaymentSuccess = (paidOrderData?: Record<string, unknown>) => {
    dispatch(clearCart());
    const fallbackOrderData = {
      orderId,
      items: cartItems,
      address,
      paymentMethod,
      total: calculateTotal(),
      orderDate: new Date().toISOString(),
    };

    navigate("/order-success", { 
      state: { 
        orderData: paidOrderData || createdOrderData || fallbackOrderData,
      } 
    });
  };

  const handlePaymentError = (errorMsg: string) => {
    setError(errorMsg);
    setStep("review"); // Go back to review step
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === "address"
                    ? "bg-blue-600 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                1
              </div>
              <span
                className={`ml-2 ${
                  step === "address" ? "text-blue-400" : "text-green-400"
                }`}
              >
                Address
              </span>
            </div>

            <div className="w-16 h-1 bg-slate-700"></div>

            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === "payment"
                    ? "bg-blue-600 text-white"
                    : step === "review" || step === "stripe"
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
                    : step === "review" || step === "stripe"
                    ? "text-green-400"
                    : "text-gray-400"
                }`}
              >
                Payment
              </span>
            </div>

            <div className="w-16 h-1 bg-slate-700"></div>

            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === "review" || step === "stripe"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-gray-400"
                }`}
              >
                3
              </div>
              <span
                className={`ml-2 ${
                  step === "review" || step === "stripe" ? "text-blue-400" : "text-gray-400"
                }`}
              >
                {step === "stripe" ? "Pay" : "Review"}
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-red-600/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
              <svg
                className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-red-400 font-semibold">Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-300"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Side - Forms */}
          <div className="lg:col-span-2">
            {/* Address Form */}
            {step === "address" && (
              <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Shipping Address
                </h2>
                <form onSubmit={handleAddressSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={address.fullName}
                      onChange={(e) =>
                        setAddress({ ...address, fullName: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      required
                      value={address.phone}
                      onChange={(e) =>
                        setAddress({ ...address, phone: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={address.email}
                    onChange={(e) =>
                      setAddress({ ...address, email: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    placeholder="Address Line 1"
                    required
                    value={address.addressLine1}
                    onChange={(e) =>
                      setAddress({ ...address, addressLine1: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <input
                    type="text"
                    placeholder="Address Line 2 (Optional)"
                    value={address.addressLine2}
                    onChange={(e) =>
                      setAddress({ ...address, addressLine2: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      required
                      value={address.city}
                      onChange={(e) =>
                        setAddress({ ...address, city: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      required
                      value={address.state}
                      onChange={(e) =>
                        setAddress({ ...address, state: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Pincode"
                      required
                      value={address.pincode}
                      onChange={(e) =>
                        setAddress({ ...address, pincode: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg"
                  >
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {/* Payment Form */}
            {step === "payment" && (
              <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Payment Method
                </h2>
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {/* Payment Options */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition">
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={(e) => setPaymentMethod(e.target.value as "cod")}
                        className="w-5 h-5"
                      />
                      <span className="text-white font-semibold">
                        Cash on Delivery
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition">
                      <input
                        type="radio"
                        name="payment"
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={(e) => setPaymentMethod(e.target.value as "card")}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <span className="text-white font-semibold block">
                          Credit/Debit Card
                        </span>
                        <span className="text-gray-400 text-sm">
                          Powered by Stripe - Secure payment
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg cursor-not-allowed opacity-50">
                      <input
                        type="radio"
                        name="payment"
                        value="upi"
                        disabled
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <span className="text-white font-semibold block">
                          UPI Payment
                        </span>
                        <span className="text-gray-400 text-sm">
                          Coming soon
                        </span>
                      </div>
                    </label>
                  </div>

                  {paymentMethod === "card" && (
                    <div className="rounded-lg border border-blue-500/40 bg-blue-600/10 p-4">
                      <p className="text-sm font-semibold text-blue-300">
                        Card details are shown on the next step
                      </p>
                      <p className="mt-1 text-xs text-blue-200/80">
                        Click "Review Order" then "Proceed to Payment" to open the secure Stripe card form.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep("address")}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg"
                    >
                      Review Order
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Review Order */}
            {step === "review" && (
              <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Review Your Order
                </h2>

                {/* Shipping Address Review */}
                <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">
                    Shipping Address
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {address.fullName}<br />
                    {address.addressLine1}, {address.addressLine2}<br />
                    {address.city}, {address.state} - {address.pincode}<br />
                    Phone: {address.phone}<br />
                    Email: {address.email}
                  </p>
                  <button
                    onClick={() => setStep("address")}
                    className="mt-2 text-blue-400 text-sm hover:underline"
                  >
                    Edit Address
                  </button>
                </div>

                {/* Payment Method Review */}
                <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                  <h3 className="text-white font-semibold mb-2">
                    Payment Method
                  </h3>
                  <p className="text-gray-300 text-sm">
                    {paymentMethod === "cod" && "Cash on Delivery"}
                    {paymentMethod === "card" && "Credit/Debit Card (Stripe)"}
                    {paymentMethod === "upi" && "UPI Payment"}
                  </p>
                  <button
                    onClick={() => setStep("payment")}
                    className="mt-2 text-blue-400 text-sm hover:underline"
                  >
                    Change Payment
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep("payment")}
                    disabled={isPlacing}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isPlacing}
                    className={`flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPlacing ? "cursor-wait" : ""
                    }`}
                  >
                    {isPlacing ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        {paymentMethod === "cod" ? "Placing Order..." : "Initializing Payment..."}
                      </span>
                    ) : (
                      paymentMethod === "cod" ? "Place Order" : "Proceed to Payment"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Stripe Payment Form */}
            {step === "stripe" && clientSecret && (
              <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Complete Payment
                </h2>
                
                <div className="mb-6 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                  <p className="text-blue-300 text-sm">
                    🔒 Secure payment powered by Stripe
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Order ID: {orderId}
                  </p>
                </div>

                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "night",
                      variables: {
                        colorPrimary: "#3b82f6",
                        colorBackground: "#334155",
                        colorText: "#ffffff",
                        colorDanger: "#ef4444",
                        fontFamily: "Arial, sans-serif",
                        borderRadius: "8px",
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    amount={calculateTotal()}
                    clientSecret={clientSecret}
                    existingOrderData={createdOrderData || { orderId }}
                    billingDetails={address}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>

                <button
                  onClick={() => setStep("review")}
                  className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
                >
                  Back to Review
                </button>
              </div>
            )}
            {step === "stripe" && !clientSecret && (
              <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-red-500/40">
                <h2 className="text-2xl font-bold text-white mb-3">Card Payment Unavailable</h2>
                <p className="text-red-300 text-sm">
                  Unable to initialize Stripe card form. Please go back, review order, and try again.
                </p>
                <button
                  onClick={() => setStep("review")}
                  className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
                >
                  Back to Review
                </button>
              </div>
            )}
          </div>

          {/* Right Side - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700 sticky top-4">
              <h3 className="text-xl font-bold text-white mb-4">
                Order Summary
              </h3>

              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <img
                      src={item.images?.[0] || item.thumbnail}
                      alt={item.title}
                      className="w-16 h-16 object-contain bg-white rounded"
                    />
                    <div className="flex-1">
                      <p className="text-white text-sm line-clamp-2">
                        {item.title}
                      </p>
                      <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-blue-400 font-semibold">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-700 pt-4 space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-slate-700">
                  <span>Total</span>
                  <span className="text-blue-400">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
