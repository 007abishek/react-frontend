import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AppLayout from "../../components/layout/AppLayout";
import {
  increaseQty,
  decreaseQty,
  removeFromCart,
} from "./cartSlice";
import {
  selectCartItems,
  selectCartTotal,
} from "./cartSelectors";

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // ✅ SAFE selectors
  const cartItems = useAppSelector(selectCartItems);
  const totalAmount = useAppSelector(selectCartTotal);

  if (cartItems.length === 0) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">
            Your Cart is Empty
          </h2>
          <button
            onClick={() => navigate("/products")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
          >
            Browse Products
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-6 bg-white dark:bg-zinc-900 border rounded-xl p-6"
              >
                <img
                  src={item.images?.[0] ?? item.thumbnail}
                  alt={item.title}
                  className="w-24 h-24 object-contain"
                />

                <div className="flex-1">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-blue-600 font-bold">
                    ₹ {item.price}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => dispatch(decreaseQty(item.id))}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => dispatch(increaseQty(item.id))}>+</button>
                </div>

                <button
                  onClick={() => dispatch(removeFromCart(item.id))}
                  className="text-red-500"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹ {totalAmount.toFixed(2)}</span>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
