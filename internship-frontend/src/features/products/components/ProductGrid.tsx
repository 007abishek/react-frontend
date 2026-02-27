import type { Product } from "../types";
import type { ProductSectionConfig } from "./ConfigRenderer";

interface Props {
  section: ProductSectionConfig;
  products: Product[];
  onProductClick: (id: number) => void;
  onQuickAdd: (e: React.MouseEvent, product: Product) => void;
}

export default function ProductGrid({
  section,
  products,
  onProductClick,
  onQuickAdd,
}: Props) {
  const { filter } = section;

  const filteredProducts = products.filter((product) => {
    if (filter?.category) {
      if (!product.category || product.category.toLowerCase() !== filter.category.toLowerCase()) {
        return false;
      }
    }

    if (filter?.minRating !== undefined && product.rating < filter.minRating) {
      return false;
    }

    return true;
  });

  if (filteredProducts.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">{section.title}</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => {
          const stock = Number(product.stock ?? 0);
          const isOutOfStock = stock <= 0;
          const isLowStock = stock > 0 && stock < 5;

          return (
            <div
              key={product.id}
              onClick={() => onProductClick(product.id)}
              className="group cursor-pointer rounded-2xl bg-white p-4 shadow-sm hover:shadow-xl dark:bg-zinc-900"
            >
              <div className="flex h-44 items-center justify-center rounded-xl bg-slate-50 dark:bg-zinc-800">
                <img src={product.thumbnail} alt={product.title} className="h-36 object-contain" />
              </div>

              <h3 className="mt-4 line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
                {product.title}
              </h3>

              <p className="mt-2 font-semibold text-gray-900 dark:text-white">? {product.price}</p>

              {isOutOfStock && <p className="mt-2 text-sm font-semibold text-red-500">Out of stock</p>}
              {isLowStock && <p className="mt-2 text-sm font-semibold text-amber-500">Only {stock} left</p>}

              <button
                onClick={(e) => {
                  if (isOutOfStock) {
                    e.stopPropagation();
                    return;
                  }
                  onQuickAdd(e, product);
                }}
                disabled={isOutOfStock}
                className="mt-4 w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:hover:bg-slate-500"
              >
                {isOutOfStock ? "Out of Stock" : "Add to Cart"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

