import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state?.orderData;

  useEffect(() => {
    // If no order data, redirect to products page
    if (!orderData) {
      navigate("/products");
    }
  }, [orderData, navigate]);

  if (!orderData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-600 rounded-full mb-6 animate-bounce">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Order Placed Successfully!
          </h1>
          <p className="text-gray-400 text-lg">
            Thank you for your purchase
          </p>
        </div>

        {/* Order Details Card */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-slate-700 shadow-2xl">
          {/* Order ID and Date */}
          <div className="border-b border-slate-700 pb-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Order ID</p>
                <p className="text-white font-mono text-lg font-semibold">
                  {orderData.orderId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm mb-1">Order Date</p>
                <p className="text-white">
                  {new Date(orderData.orderDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600/20 text-green-400 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="font-semibold">Order Confirmed</span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Delivery Address
            </h3>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-white font-medium">{orderData.address.fullName}</p>
              <p className="text-gray-300 text-sm mt-1">
                {orderData.address.addressLine1}
                {orderData.address.addressLine2 && `, ${orderData.address.addressLine2}`}
              </p>
              <p className="text-gray-300 text-sm">
                {orderData.address.city}, {orderData.address.state} - {orderData.address.pincode}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Phone: {orderData.address.phone}
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3">Order Items</h3>
            <div className="space-y-3">
              {orderData.items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex gap-4 bg-slate-700/50 rounded-lg p-3"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-16 h-16 object-contain bg-white rounded"
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium line-clamp-2">
                      {item.title}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-blue-400 font-semibold">
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t border-slate-700 pt-6 mb-6">
            <h3 className="text-white font-semibold mb-3">Payment Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>₹{orderData.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Delivery Charges</span>
                <span className="text-green-400">Free</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-slate-700">
                <span>Total Paid</span>
                <span className="text-blue-400">₹{orderData.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 pt-2">
                <span>Payment Method</span>
                <span className="text-white capitalize">
                  {orderData.paymentMethod === "cod"
                    ? "Cash on Delivery"
                    : orderData.paymentMethod === "card"
                    ? "Card Payment"
                    : "UPI Payment"}
                </span>
              </div>
            </div>
          </div>

          {/* Estimated Delivery */}
          <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                />
              </svg>
              <div>
                <p className="text-white font-semibold">
                  Estimated Delivery
                </p>
                <p className="text-blue-400 text-sm">
                  {new Date(
                    Date.now() + 5 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString()} (5-7 business days)
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate("/products")}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg"
            >
              Go to Home
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            A confirmation email has been sent to{" "}
            <span className="text-white">{orderData.address.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}