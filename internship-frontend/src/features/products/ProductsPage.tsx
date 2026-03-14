import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import SignupPrompt from "../../components/SignupPrompt";
import { useToast } from "../../components/toast/useToast";
import { addToCart, type CartItem } from "./cartSlice";
import ProductGridSkeleton from "./components/ProductGridSkeleton";
import ConfigRenderer from "./components/ConfigRenderer";
import { useGetProductsQuery } from "./productApi";
import { productsPageConfig } from "./config/productsPageConfig";
import { productSearchQuerySchema } from "./schemas/productSearchSchemas";
import type { Product } from "./types";

export default function ProductsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();

  //Data fetching
  const { data = [], isLoading, isError } = useGetProductsQuery();
  

  //accessing redux global state
  const { user } = useAppSelector((state) => state.auth);
  const isGuest = user?.provider === "guest";

  const [showPrompt, setShowPrompt] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) return data;

    return data.filter((product) => {
      const title = String(product.title ?? "").toLowerCase();
      const description = String(product.description ?? "").toLowerCase();
      const category = String(product.category ?? "").toLowerCase();

      return (
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        category.includes(normalizedSearch)
      );
    });
  }, [data, normalizedSearch]);

  const handleProductClick = (productId: number) => {
    navigate(`/product/${productId}`);
  };

  const handleQuickAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();

    if (isGuest) {
      setShowPrompt(true);
      return;
    }

    const cartItem: CartItem = {
      id: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail,
      images: product.images ?? [],
      quantity: 1,
    };

    dispatch(addToCart(cartItem));
    toast.success(`Added "${product.title}" to cart`, "Added to cart");
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
      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl lg:text-3xl">
            Products
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Browse products and add them to your cart
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 sm:w-auto"
        >
          Order History
        </button>
      </div>

      <div className="mb-6">
        <label htmlFor="products-search" className="sr-only">
          Search products
        </label>
        <div className="relative">
          <input
            id="products-search"
            type="search"
            value={searchQuery}
            onChange={(event) => {
              const validation = productSearchQuerySchema.safeParse(event.target.value);
              if (!validation.success) {
                setSearchError(validation.error.issues[0]?.message ?? "Invalid search query");
                return;
              }

              setSearchError("");
              setSearchQuery(event.target.value);
            }}
            placeholder="Search by name, category, or description..."
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 sm:py-3 pr-10 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-zinc-900 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-900"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-zinc-800 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {searchError ? <p className="mt-2 text-xs text-rose-500">{searchError}</p> : null}
      </div>

      {productsPageConfig.sections
        .filter((section) => section.enabled)
        .map((section) => (
          <ConfigRenderer
            key={section.id}
            section={section}
            products={filteredProducts}
            onProductClick={handleProductClick}
            onQuickAdd={handleQuickAddToCart}
          />
        ))}

      {normalizedSearch && filteredProducts.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-300">
          No products found for "{searchQuery}".
        </p>
      )}

      {showPrompt && <SignupPrompt message="Sign up to add products to your cart" />}
    </AppLayout>
  );
}
