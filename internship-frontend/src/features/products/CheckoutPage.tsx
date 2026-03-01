import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { clearCart } from "./cartSlice";
import {
  createOrderViaAction,
  createStripePaymentIntentViaAction,
} from "./hasuraCommerce";
import StripePaymentForm from "./StripePaymentForm";

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);
const hasStripeKey = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

const COMMON_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Bhopal",
  "Patna",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Vadodara",
];
function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  if (typeof err === "object" && err !== null && "message" in err) {
    const message = String((err as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }

  return "Failed to place order. Please try again.";
}

function buildCheckoutSignature(params: {
  items: Array<{ id: number; quantity: number; price: number }>;
  address: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
  };
  paymentMethod: "cod" | "card" | "upi";
  total: number;
}): string {
  return JSON.stringify({
    items: params.items
      .map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
      }))
      .sort((a, b) => a.id - b.id),
    address: params.address,
    paymentMethod: params.paymentMethod,
    total: Number(params.total.toFixed(2)),
  });
}

function generateCheckoutAttemptId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `ORD-${crypto.randomUUID()}`;
  }
  return `ORD-${Date.now()}`;
}

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
  const [createdOrderSignature, setCreatedOrderSignature] = useState("");

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
  const [pincodeStatus, setPincodeStatus] = useState("");
  const [pincodeCities, setPincodeCities] = useState<string[]>([]);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card" | "upi">("cod");

  const cityOptions = useMemo(() => {
    const q = address.city.trim().toLowerCase();
    const merged = [...COMMON_CITIES, ...pincodeCities];
    const unique = Array.from(new Set(merged));

    if (!q) return unique.slice(0, 20);
    return unique.filter((city) => city.toLowerCase().includes(q)).slice(0, 20);
  }, [address.city, pincodeCities]);

  const stateOptions = useMemo(() => {
    const q = address.state.trim().toLowerCase();
    if (!q) return INDIAN_STATES;
    return INDIAN_STATES.filter((state) => state.toLowerCase().includes(q));
  }, [address.state]);

  useEffect(() => {
    const pincode = address.pincode.trim();

    if (!/^\d{6}$/.test(pincode)) {
      setPincodeStatus("");
      setPincodeCities([]);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setPincodeStatus("Checking pincode...");
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const result = (await response.json()) as Array<{
          Status?: string;
          PostOffice?: Array<{ Name?: string; District?: string; State?: string }>;
        }>;

        if (cancelled) return;

        const first = result?.[0];
        const offices = first?.PostOffice ?? [];

        if (first?.Status !== "Success" || offices.length === 0) {
          setPincodeStatus("Pincode not found. Please enter city and state manually.");
          setPincodeCities([]);
          return;
        }

        const suggestedCities = Array.from(
          new Set(
            offices
              .map((office) => office.District?.trim() || office.Name?.trim() || "")
              .filter(Boolean)
          )
        );

        const firstOffice = offices[0];
        const cityFromPincode =
          firstOffice.District?.trim() || firstOffice.Name?.trim() || "";
        const stateFromPincode = firstOffice.State?.trim() || "";

        setPincodeCities(suggestedCities);
        setAddress((prev) => ({
          ...prev,
          city: cityFromPincode || prev.city,
          state: stateFromPincode || prev.state,
        }));
        setPincodeStatus("City and state auto-filled from pincode.");
      } catch {
        if (!cancelled) {
          setPincodeStatus("Could not verify pincode right now. You can fill city/state manually.");
        }
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [address.pincode]);
 
  
  

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

    const currentSignature = buildCheckoutSignature({
      items: cartItems.map((item) => ({ id: item.id, quantity: item.quantity, price: item.price })),
      address,
      paymentMethod,
      total: calculateTotal(),
    });
    const canReuseExistingOrder =
      Boolean(orderId) &&
      Boolean(createdOrderData) &&
      createdOrderSignature === currentSignature;

    const stableOrderId = canReuseExistingOrder ? orderId : generateCheckoutAttemptId();
    const orderData = {
      items: cartItems,
      address,
      paymentMethod,
      total: calculateTotal(),
      orderId: stableOrderId,
      orderDate: new Date().toISOString(),
    };

    try {
      let createdOrderId = stableOrderId;
      let nextOrderData = createdOrderData;

      // Reuse only when checkout data is unchanged; edits create a new order attempt.
      if (!canReuseExistingOrder) {
        const createdOrder = await createOrderViaAction(orderData);
        createdOrderId = createdOrder.orderId;
        nextOrderData = {
          ...orderData,
          ...createdOrder,
        };
        setOrderId(createdOrderId);
        setCreatedOrderData(nextOrderData);
        setCreatedOrderSignature(currentSignature);
      }

      // Step 2: Handle Payment Based on Method
      if (paymentMethod === "cod") {
        dispatch(clearCart());
        navigate("/order-success", {
          state: {
            orderData: {
              ...orderData,
              ...(nextOrderData || {}),
            },
          },
        });
      } else if (paymentMethod === "card") {
        if (!hasStripeKey) {
          setError("Stripe publishable key is missing. Set VITE_STRIPE_PUBLISHABLE_KEY in frontend .env.");
          setIsPlacing(false);
          return;
        }

        const paymentResult = await createStripePaymentIntentViaAction({
          orderId: createdOrderId,
          amount: calculateTotal(),
          currency: "inr",
        });
        setClientSecret(paymentResult.clientSecret);
        setIsPlacing(false);
        setStep("stripe");
      } else if (paymentMethod === "upi") {
        setError("UPI payment coming soon. Please use Card or COD.");
        setIsPlacing(false);
      }
      
    } catch (err: unknown) {
      console.error("Order placement failed:", err);
      setError(getErrorMessage(err));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            <div className="flex items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold sm:h-10 sm:w-10 ${
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

            <div className="hidden h-1 w-10 bg-slate-700 sm:block sm:w-16"></div>

            <div className="flex items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold sm:h-10 sm:w-10 ${
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

            <div className="hidden h-1 w-10 bg-slate-700 sm:block sm:w-16"></div>

            <div className="flex items-center">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold sm:h-10 sm:w-10 ${
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
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
                <h2 className="mb-6 text-xl font-bold text-white sm:text-2xl">
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
                      list="city-options"
                      required
                      value={address.city}
                      onChange={(e) =>
                        setAddress({ ...address, city: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="city-options">
                      {cityOptions.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                    <input
                      type="text"
                      placeholder="State"
                      list="state-options"
                      required
                      value={address.state}
                      onChange={(e) =>
                        setAddress({ ...address, state: e.target.value })
                      }
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id="state-options">
                      {stateOptions.map((state) => (
                        <option key={state} value={state} />
                      ))}
                    </datalist>
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

                  {pincodeStatus && (
                    <p className="text-xs text-slate-300">{pincodeStatus}</p>
                  )}

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
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
                <h2 className="mb-6 text-xl font-bold text-white sm:text-2xl">
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

                  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
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
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
                <h2 className="mb-6 text-xl font-bold text-white sm:text-2xl">
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

                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
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
              <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
                <h2 className="mb-6 text-xl font-bold text-white sm:text-2xl">
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
              <div className="rounded-2xl border border-red-500/40 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6">
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
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-lg sm:p-6 lg:sticky lg:top-4">
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


