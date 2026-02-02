import AppLayout from "../../components/layout/AppLayout";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  increaseQty,
  decreaseQty,
  removeFromCart,
} from "./cartSlice";
import CartSummary from "./CartSummary";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-6">Your Cart</h1>

      {items.length === 0 && <p>Cart is empty</p>}

      {items.map((item) => (
        <div
          key={item.id}
          className="flex justify-between items-center border p-4 mb-3"
        >
          <div>
            <h2>{item.title}</h2>
            <p>₹ {item.price}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch(decreaseQty(item.id))}
            >
              −
            </button>
            <span>{item.quantity}</span>
            <button
              onClick={() => dispatch(increaseQty(item.id))}
            >
              +
            </button>
          </div>

          <button
            onClick={() => dispatch(removeFromCart(item.id))}
            className="text-red-500"
          >
            Remove
          </button>
        </div>
      ))}

      <CartSummary />
    </AppLayout>
  );
}
