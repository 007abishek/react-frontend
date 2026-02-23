import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import SignupPrompt from "../../components/SignupPrompt";
import { addToCart } from "./cartSlice";
import ProductGridSkeleton from "./components/ProductGridSkeleton";
import ConfigRenderer from "./components/ConfigRenderer";
import { useGetProductsQuery } from "./productApi";
import { productsPageConfig } from "./config/productsPageConfig";

export default function ProductsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data = [], isLoading, isError } = useGetProductsQuery();

  const { user } = useAppSelector((state) => state.auth);
  const isGuest = user?.provider === "guest";

  const [showPrompt, setShowPrompt] = useState(false);

  const handleProductClick = (productId: number) => {
    navigate(`/product/${productId}`);
  };

  const handleQuickAddToCart = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();

    if (isGuest) {
      setShowPrompt(true);
      return;
    }

    dispatch(addToCart(product));
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mb-6 animate-pulse">
          <div className="h-10 w-40 rounded-md bg-slate-200 dark:bg-zinc-700 shimmer" />
          <div className="mt-2 h-5 w-72 rounded-md bg-slate-200 dark:bg-zinc-700 shimmer" />
        </div>
        <ProductGridSkeleton cards={6} />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <p className="text-red-500 dark:text-red-400">Failed to load products</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Products
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Browse products and add them to your cart
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
        >
          Order History
        </button>
      </div>

      {productsPageConfig.sections
        .filter((section) => section.enabled)
        .map((section) => (
          <ConfigRenderer
            key={section.id}
            section={section}
            products={data}
            onProductClick={handleProductClick}
            onQuickAdd={handleQuickAddToCart}
          />
        ))}

      {showPrompt && <SignupPrompt message="Sign up to add products to your cart" />}
    </AppLayout>
  );
}
