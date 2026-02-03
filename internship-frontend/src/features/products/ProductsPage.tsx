import { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useGetProductsQuery } from "./productApi";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { addToCart } from "./cartSlice";
import SignupPrompt from "../../components/SignupPrompt";

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const { data, isLoading, isError } = useGetProductsQuery();

  const { user } = useAppSelector((state) => state.auth);
  const isGuest = user?.provider === "guest";

  const [showPrompt, setShowPrompt] = useState(false);

  /* ===== Loading State ===== */
  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-slate-500">Loading products…</p>
      </AppLayout>
    );
  }

  /* ===== Error State ===== */
  if (isError) {
    return (
      <AppLayout>
        <p className="text-red-500">Failed to load products</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* ===== Header ===== */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Products
        </h1>
        <p className="mt-1 text-slate-500">
          Browse products and add them to your cart
        </p>
      </div>

      {/* ===== Product Grid ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data?.map((product) => (
          <div
            key={product.id}
            className="
              group
              rounded-2xl
              bg-white dark:bg-zinc-900
              p-4
              shadow-sm
              transition
              hover:shadow-xl
              hover:-translate-y-1
            "
          >
            {/* 🖼 Product Image (DummyJSON uses thumbnail) */}
            <div className="h-44 flex items-center justify-center bg-slate-50 dark:bg-zinc-800 rounded-xl">
              <img
                src={product.images?.[0] ?? product.thumbnail}
                alt={product.title}
                className="
                  h-36
                  object-contain
                  pointer-events-none
                  transition
                  group-hover:scale-105
                "
              />
            </div>

            {/* 📝 Title */}
            <h2 className="mt-4 text-sm font-medium line-clamp-2 text-slate-900 dark:text-white">
              {product.title}
            </h2>

            {/* 💰 Price */}
            <p className="mt-2 font-semibold text-slate-900 dark:text-white">
              ₹ {product.price}
            </p>

            {/* 🛒 Add to Cart */}
            <button
              type="button"
              onClick={() => {
                if (isGuest) {
                  setShowPrompt(true);
                  return;
                }
                dispatch(addToCart(product));
              }}
              className="
                mt-4
                w-full
                rounded-md
                bg-blue-600
                py-2
                text-sm font-medium text-white
                transition
                hover:bg-blue-700
              "
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      {/* 🔔 Signup prompt for guest users */}
      {showPrompt && (
        <SignupPrompt message="Sign up to add products to your cart" />
      )}
    </AppLayout>
  );
}
