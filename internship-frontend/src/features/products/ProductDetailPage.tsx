import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch } from "../../app/hooks";
import ProductDetailSkeleton from "./components/ProductDetailSkeleton";
import { addToCart } from "./cartSlice";
import { useGetProductByIdQuery } from "./productApi";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const productId = Number(id);

  const { data: product, isLoading } = useGetProductByIdQuery(productId);

  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (!product) return;

    dispatch(
      addToCart({
        id: product.id,
        title: product.title,
        price: product.price,
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

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white">
        Product not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-8">
      <div className="mx-auto mb-6 max-w-7xl">
        <button
          onClick={() => navigate("/products")}
          className="text-blue-400 transition hover:text-blue-300"
        >
          {"<- Back to Products"}
        </button>
      </div>

      <div className="mx-auto max-w-7xl rounded-2xl border border-slate-700 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-lg">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="rounded-xl bg-white p-8">
            <img
              src={product.thumbnail}
              alt={product.title}
              className="h-96 w-full object-contain"
            />
          </div>

          <div className="text-white">
            <span className="mb-4 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold">
              {product.category}
            </span>

            <h1 className="mb-4 text-3xl font-bold">{product.title}</h1>

            <div className="mb-6 text-4xl font-bold text-blue-400">
              &#8377; {product.price}
            </div>

            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={decrementQuantity}
                  className="h-10 w-10 rounded-lg border border-slate-600 transition hover:bg-slate-700"
                >
                  -
                </button>
                <span className="w-12 text-center text-xl font-semibold">{quantity}</span>
                <button
                  onClick={incrementQuantity}
                  className="h-10 w-10 rounded-lg border border-slate-600 transition hover:bg-slate-700"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mb-8 flex gap-4">
              <button
                onClick={handleAddToCart}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold transition hover:from-blue-700 hover:to-indigo-700"
              >
                {addedToCart ? "Added to Cart" : "Add to Cart"}
              </button>

              <button
                onClick={handleBuyNow}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold transition hover:from-purple-700 hover:to-pink-700"
              >
                Buy Now
              </button>
            </div>

            <div className="border-t border-slate-700 pt-6">
              <h2 className="mb-3 text-xl font-bold">Product Description</h2>
              <p className="leading-relaxed text-gray-300">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
