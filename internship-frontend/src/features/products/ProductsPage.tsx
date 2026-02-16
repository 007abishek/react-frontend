import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { useGetProductsQuery } from "./productApi";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { addToCart } from "./cartSlice";
import SignupPrompt from "../../components/SignupPrompt";

// ✅ NEW imports (config-driven UI)
import { productsPageConfig } from "./config/productsPageConfig";
import ConfigRenderer from "./components/ConfigRenderer";

export default function ProductsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // keep API exactly same
  const { data = [], isLoading, isError } = useGetProductsQuery();

  const { user } = useAppSelector((state) => state.auth);
  const isGuest = user?.provider === "guest";

  const [showPrompt, setShowPrompt] = useState(false);

  /* ===== Handle Product Click ===== */
  const handleProductClick = (productId: number) => {
    navigate(`/product/${productId}`);
  };

  /* ===== Handle Quick Add to Cart ===== */
  const handleQuickAddToCart = (
    e: React.MouseEvent,
    product: any
  ) => {
    e.stopPropagation();

    if (isGuest) {
      setShowPrompt(true);
      return;
    }

    dispatch(addToCart(product));
  };

  /* ===== Loading State ===== */
  if (isLoading) {
    return (
      <AppLayout>
        <p className="text-slate-500 dark:text-slate-400">Loading products…</p>
      </AppLayout>
    );
  }

  /* ===== Error State ===== */
  if (isError) {
    return (
      <AppLayout>
        <p className="text-red-500 dark:text-red-400">Failed to load products</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* ===== Header (UPDATED for theme) ===== */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Products
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Browse products and add them to your cart
        </p>
      </div>

      {/* ===== CONFIG-DRIVEN UI (NEW) ===== */}
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

      {/* ===== Signup Prompt (UNCHANGED) ===== */}
      {showPrompt && (
        <SignupPrompt message="Sign up to add products to your cart" />
      )}
    </AppLayout>
  );
}