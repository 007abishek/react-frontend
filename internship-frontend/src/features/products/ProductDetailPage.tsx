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

  const stock = Number(product?.stock ?? 0);
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock < 5;

  const incrementQuantity = () => {
    if (!product) return;
    setQuantity((prev) => (prev < stock ? prev + 1 : prev));
  };

  const decrementQuantity = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;

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
    if (isOutOfStock) return;
    handleAddToCart();
    setTimeout(() => navigate("/cart"), 500);
  };

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return <div className="flex min-h-screen items-center justify-center text-white">Product not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-4 py-6 sm:py-8">
      <div className="mx-auto mb-6 max-w-7xl">
        <button onClick={() => navigate("/products")} className="text-blue-400 transition hover:text-blue-300">
          {"<- Back to Products"}
        </button>
      </div>

      <div className="mx-auto max-w-7xl rounded-2xl border border-slate-700 bg-slate-800/50 p-4 shadow-2xl backdrop-blur-lg sm:p-8">
        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <div className="rounded-xl bg-white p-4 sm:p-8">
            <img src={product.thumbnail} alt={product.title} className="h-64 w-full object-contain sm:h-80 md:h-96" />
          </div>

          <div className="text-white">
            <span className="mb-4 inline-block rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold">
              {product.category}
            </span>

            <h1 className="mb-4 text-2xl font-bold sm:text-3xl">{product.title}</h1>

            <div className="mb-3 text-3xl font-bold text-blue-400 sm:text-4xl">&#8377; {product.price}</div>
            {isOutOfStock && <p className="mb-6 text-sm font-semibold text-red-400">Out of stock</p>}
            {isLowStock && <p className="mb-6 text-sm font-semibold text-amber-300">Only {stock} left</p>}

            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold">Quantity</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={decrementQuantity}
                  disabled={isOutOfStock}
                  className="h-10 w-10 rounded-lg border border-slate-600 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  -
                </button>
                <span className="w-12 text-center text-xl font-semibold">{quantity}</span>
                <button
                  onClick={incrementQuantity}
                  disabled={isOutOfStock || quantity >= stock}
                  className="h-10 w-10 rounded-lg border border-slate-600 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-3 font-semibold transition hover:from-blue-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-600"
              >
                {isOutOfStock ? "Out of Stock" : addedToCart ? "Added to Cart" : "Add to Cart"}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold transition hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-600"
              >
                {isOutOfStock ? "Unavailable" : "Buy Now"}
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
