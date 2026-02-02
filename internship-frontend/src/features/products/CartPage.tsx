import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AppLayout from "../../components/layout/AppLayout";
import {
  increaseQty,
  decreaseQty,
  removeFromCart,
} from "./cartSlice";

export default function CartPage() {
  const dispatch = useAppDispatch();

  const cartItems = useAppSelector(
    (state) => state.cart.items
  );

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (cartItems.length === 0) {
    return (
      <AppLayout>
        <h1 className="text-2xl font-bold mb-4">
          Your Cart
        </h1>
        <p className="text-gray-400">
          Your cart is empty.
        </p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-6">
        Your Cart
      </h1>

      {/* Cart Items */}
      <ul className="space-y-4">
        {cartItems.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg px-6 py-4"
          >
            {/* LEFT: Product Info */}
            <div>
              <h3 className="text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="text-gray-300">
                ₹ {item.price}
              </p>
            </div>

            {/* RIGHT: Quantity Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  dispatch(decreaseQty(item.id))
                }
                className="w-8 h-8 flex items-center justify-center border border-gray-500 rounded text-white hover:bg-gray-700"
              >
                −
              </button>

              <span className="text-white font-medium w-4 text-center">
                {item.quantity}
              </span>

              <button
                onClick={() =>
                  dispatch(increaseQty(item.id))
                }
                className="w-8 h-8 flex items-center justify-center border border-gray-500 rounded text-white hover:bg-gray-700"
              >
                +
              </button>

              {/* Remove */}
              <button
                onClick={() =>
                  dispatch(removeFromCart(item.id))
                }
                className="ml-4 text-red-500 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Summary */}
      <div className="mt-8 flex justify-between items-center border-t border-gray-700 pt-4">
        <span className="text-lg font-semibold">
          Total:
        </span>
        <span className="text-xl font-bold">
          ₹ {totalAmount.toFixed(2)}
        </span>
      </div>
    </AppLayout>
  );
}
