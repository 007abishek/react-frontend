import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import AppLayout from "../../components/layout/AppLayout";
import { useToast } from "../../components/toast/useToast";
import ProductDetailSkeleton from "./components/ProductDetailSkeleton";
import { addToCart } from "./cartSlice";
import { useGetProductByIdQuery } from "./productApi";
import { productIdParamSchema } from "./schemas/routeSchemas";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const user = useAppSelector((state) => state.auth.user);
  const isGuest = user?.provider === "guest";

  const parsedProductId = productIdParamSchema.safeParse(id);
  const productId = parsedProductId.success ? parsedProductId.data : 0;
  const { data: product, isLoading } = useGetProductByIdQuery(productId, {
    skip: !parsedProductId.success,
  });

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
    if (!product) return;
    if (isGuest) {
      toast.info("Please sign up to add items to your cart.", "Guest account");
      return;
    }
    if (isOutOfStock) {
      toast.warning("This product is currently out of stock.", "Out of stock");
      return;
    }

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
    toast.success(`Added "${product.title}" to cart`, "Added to cart");
  };

  const handleBuyNow = () => {
    if (isGuest) {
      toast.info("Please sign up to buy products.", "Guest account");
      return;
    }
    if (isOutOfStock) {
      toast.warning("This product is currently out of stock.", "Out of stock");
      return;
    }
    handleAddToCart();
    setTimeout(() => navigate("/cart"), 500);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-6xl">
          <ProductDetailSkeleton />
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="py-16 text-center text-sm text-slate-600 dark:text-slate-300">
          {parsedProductId.success ? "Product not found" : "Invalid product id"}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate("/products")}
          className="mb-6 text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 sm:text-base"
        >
          {"<- Back to Products"}
        </button>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8">
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 md:gap-12">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-950 sm:p-6 lg:p-8">
              <img
                src={product.thumbnail}
                alt={product.title}
                className="h-52 w-full object-contain sm:h-64 md:h-80 lg:h-96"
              />
            </div>

            <div>
              <span className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-600 dark:text-white">
                {product.category}
              </span>

              <h1 className="mb-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl lg:text-3xl">
                {product.title}
              </h1>

              <div className="mb-3 text-2xl font-bold text-blue-600 dark:text-blue-400 sm:text-3xl lg:text-4xl">
                &#8377; {product.price}
              </div>
              {isOutOfStock && <p className="mb-6 text-sm font-semibold text-red-600 dark:text-red-400">Out of stock</p>}
              {isLowStock && (
                <p className="mb-6 text-sm font-semibold text-amber-700 dark:text-amber-300">Only {stock} left</p>
              )}

              <div className="mb-6">
                <label className="mb-3 block text-sm font-semibold text-slate-900 dark:text-white">Quantity</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={decrementQuantity}
                    disabled={isOutOfStock}
                    className="h-9 w-9 rounded-lg border border-slate-300 text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-slate-100 dark:hover:bg-zinc-800 sm:h-10 sm:w-10"
                  >
                    -
                  </button>
                  <span className="w-12 text-center text-xl font-semibold text-slate-900 dark:text-white">{quantity}</span>
                  <button
                    type="button"
                    onClick={incrementQuantity}
                    disabled={isOutOfStock || quantity >= stock}
                    className="h-10 w-10 rounded-lg border border-slate-300 text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-slate-100 dark:hover:bg-zinc-800"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isGuest}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
                >
                  {isGuest
                    ? "Sign Up to Buy"
                    : isOutOfStock
                      ? "Out of Stock"
                      : addedToCart
                        ? "Added to Cart"
                        : "Add to Cart"}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isOutOfStock || isGuest}
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 sm:py-3"
                >
                  {isGuest ? "Sign Up First" : isOutOfStock ? "Unavailable" : "Buy Now"}
                </button>
              </div>

              <div className="border-t border-slate-200 pt-6 dark:border-zinc-700">
                <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">Product Description</h2>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                  {product.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
