import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AppLayout from "../../components/layout/AppLayout";
import { useToast } from "../../components/toast/useToast";
import { increaseQty, decreaseQty, removeFromCart } from "./cartSlice";
import { selectCartItems, selectCartTotal } from "./cartSelectors";

export default function CartPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const cartItems = useAppSelector(selectCartItems);
  const totalAmount = useAppSelector(selectCartTotal);

  if (cartItems.length === 0) {
    return (
      <AppLayout>
        <div className="py-12 text-center">
          <h2 className="mb-2 text-2xl font-bold">Your Cart is Empty</h2>
          <button
            onClick={() => navigate("/products")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Browse Products
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl px-3 sm:px-4 lg:px-0">
        <h1 className="mb-6 text-xl sm:text-2xl  font-bold lg:text-3xl">Your Cart</h1>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-xl border bg-white p-3 dark:bg-zinc-900 sm:flex-row sm:items-center sm:gap-6 sm:p-5 lg:p-6"
              >
                <img
                  src={item.images?.[0] ?? item.thumbnail}
                  alt={item.title}
                  className="h-20 w-20 sm:h-24 sm:w-24 self-start object-contain sm:self-auto"
                />

                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-semibold">{item.title}</h3>
                  <p className="text-sm sm:text-base font-bold text-blue-600">Rs {item.price}</p>
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-4">
                  <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-slate-200 dark:border-zinc-700">
                    <button
                      type="button"
                      onClick={() => dispatch(decreaseQty(item.id))}
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                      className="px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-200 dark:hover:bg-zinc-800"
                    >
                      -
                    </button>
                    <span className="min-w-10 px-3 py-2 text-center text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch(increaseQty(item.id))}
                      aria-label="Increase quantity"
                      className="px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-zinc-800"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      dispatch(removeFromCart(item.id));
                      toast.info(`Removed "${item.title}" from cart`, "Removed");
                    }}
                    className="text-xs sm:text-sm font-medium text-rose-500 transition hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="h-fit self-start rounded-xl bg-white p-4 sm:p-5 lg:sticky lg:top-24 lg:p-6 dark:bg-zinc-900">
            <div className="flex justify-between text-base sm:text-lg font-bold">
              <span>Total</span>
              <span>Rs {totalAmount.toFixed(2)}</span>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="mt-4 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:py-3 sm:text-base"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
