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

  if (isLoading) {
    return (
      <AppLayout>
        <p>Loading products...</p>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <p className="text-red-500">Failed to load products</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-2xl font-bold mb-6">Products</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data?.map((product) => (
          <div
            key={product.id}
            className="bg-gray-900 text-white rounded-xl p-4 shadow"
          >
            {/* 🖼 Image (not clickable) */}
            <img
              src={product.image}
              alt={product.title}
              className="h-40 mx-auto object-contain pointer-events-none"
            />

            {/* 📝 Title (not clickable) */}
            <h2 className="mt-3 font-medium line-clamp-2 pointer-events-none">
              {product.title}
            </h2>

            <p className="font-bold mt-2">₹ {product.price}</p>

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
              className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded"
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
