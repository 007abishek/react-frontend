import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { clearCart } from "./cartSlice";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector((state) => state.cart.items);

  const [step, setStep] = useState<"address" | "payment" | "review">("address");

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
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  });

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("review");
  };

  const handlePlaceOrder = () => {
    // Here you would typically send order data to your backend
    const orderData = {
      items: cartItems,
      address,
      paymentMethod,
      total: calculateTotal(),
      orderId: `ORD-${Date.now()}`,
      orderDate: new Date().toISOString(),
    };

    console.log("Order placed:", orderData);

    // Clear cart and navigate to success page
    dispatch(clearCart());
    navigate("/order-success", { state: { orderData } });
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

            <div className="w-16 h-1 bg-slate-700"></div>

            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === "review"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-gray-400"
                }`}
              >
                3
              </div>
              <span
                className={`ml-2 ${
                  step === "review" ? "text-blue-400" : "text-gray-400"
                }`}
              >
                Review
              </span>
            </div>
          </div>
        </div>

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
                      <span className="text-white font-semibold">
                        Credit/Debit Card
                      </span>
                    </label>

                    <label className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition">
                      <input
                        type="radio"
                        name="payment"
                        value="upi"
                        checked={paymentMethod === "upi"}
                        onChange={(e) => setPaymentMethod(e.target.value as "upi")}
                        className="w-5 h-5"
                      />
                      <span className="text-white font-semibold">UPI Payment</span>
                    </label>
                  </div>

                  {/* Card Details (shown only if card is selected) */}
                  {paymentMethod === "card" && (
                    <div className="space-y-4 pt-4">
                      <input
                        type="text"
                        placeholder="Card Number"
                        maxLength={16}
                        required
                        value={cardDetails.cardNumber}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            cardNumber: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Cardholder Name"
                        required
                        value={cardDetails.cardName}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            cardName: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          maxLength={5}
                          required
                          value={cardDetails.expiryDate}
                          onChange={(e) =>
                            setCardDetails({
                              ...cardDetails,
                              expiryDate: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="CVV"
                          maxLength={3}
                          required
                          value={cardDetails.cvv}
                          onChange={(e) =>
                            setCardDetails({
                              ...cardDetails,
                              cvv: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
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
                  <p className="text-gray-300 text-sm capitalize">
                    {paymentMethod === "cod"
                      ? "Cash on Delivery"
                      : paymentMethod === "card"
                      ? "Credit/Debit Card"
                      : "UPI Payment"}
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
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 rounded-lg transition-all shadow-lg"
                  >
                    Place Order
                  </button>
                </div>
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