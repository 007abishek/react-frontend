import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import { addToCart } from "./cartSlice";
import { useGetProductByIdQuery } from "./productApi";
import type { Product } from "./types";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const productId = Number(id);

  // ✅ SAME API + SAME TYPE AS PRODUCT LIST
  const {
    data: product,
    isLoading,
  } = useGetProductByIdQuery(productId);

  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const incrementQuantity = () => setQuantity((p) => p + 1);
  const decrementQuantity = () =>
    setQuantity((p) => (p > 1 ? p - 1 : 1));

  const handleAddToCart = () => {
    if (!product) return;

    dispatch(
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,

        // ✅ DummyJSON → CartItem mapping
        thumbnail: product.thumbnail,
        images: product.images,

        quantity,
      })
    );

    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => navigate("/cart"), 500);
  };

  /* ==============================
     STATES
  =============================== */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading product details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Product not found
      </div>
    );
  }

  /* ==============================
     UI
  =============================== */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-8 px-4">
      {/* Back */}
      <div className="max-w-7xl mx-auto mb-6">
        <button
          onClick={() => navigate("/products")}
          className="text-blue-400 hover:text-blue-300 transition"
        >
          ← Back to Products
        </button>
      </div>

      <div className="max-w-7xl mx-auto bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-slate-700">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Image */}
          <div className="bg-white rounded-xl p-8">
            <img
              src={product.thumbnail}
              alt={product.title}
              className="w-full h-96 object-contain"
            />
          </div>

          {/* Details */}
          <div className="text-white">
            <span className="inline-block px-3 py-1 bg-blue-600 rounded-full text-xs font-semibold mb-4">
              {product.category}
            </span>

            <h1 className="text-3xl font-bold mb-4">
              {product.title}
            </h1>

            <div className="text-4xl font-bold text-blue-400 mb-6">
              ₹ {product.price}
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={decrementQuantity}
                  className="w-10 h-10 rounded-lg border border-slate-600 hover:bg-slate-700 transition"
                >
                  −
                </button>
                <span className="text-xl font-semibold w-12 text-center">
                  {quantity}
                </span>
                <button
                  onClick={incrementQuantity}
                  className="w-10 h-10 rounded-lg border border-slate-600 hover:bg-slate-700 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 rounded-lg font-semibold transition"
              >
                {addedToCart ? "✓ Added to Cart" : "Add to Cart"}
              </button>

              <button
                onClick={handleBuyNow}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 rounded-lg font-semibold transition"
              >
                Buy Now
              </button>
            </div>

            {/* Description */}
            <div className="border-t border-slate-700 pt-6">
              <h2 className="text-xl font-bold mb-3">
                Product Description
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
