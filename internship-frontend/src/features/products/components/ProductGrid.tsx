import type { Product } from "../types";

interface Props {
  section: any;
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
    // ✅ Category filter (case-safe)
    if (filter?.category) {
      if (
        !product.category ||
        product.category.toLowerCase() !==
          filter.category.toLowerCase()
      ) {
        return false;
      }
    }
   

    // ✅ Rating filter
    if (
      filter?.minRating !== undefined &&
      product.rating < filter.minRating
    ) {
      return false;
    }

    return true;
  });
  console.log(
  "SECTION:",
  section.title,
  "CATEGORIES:",
  filteredProducts.map(p => p.category)
);



  // ✅ Empty section → don't render
  if (filteredProducts.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <h2 className="mb-4 text-2xl font-bold text-white">
        {section.title}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => onProductClick(product.id)}
            className="group rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-sm hover:shadow-xl cursor-pointer"
          >
            <div className="h-44 flex items-center justify-center bg-slate-50 dark:bg-zinc-800 rounded-xl">
              <img
                src={product.thumbnail}
                alt={product.title}
                className="h-36 object-contain"
              />
            </div>

            <h3 className="mt-4 text-sm font-medium line-clamp-2">
              {product.title}
            </h3>

            <p className="mt-2 font-semibold">
              ₹ {product.price}
            </p>

            <button
              onClick={(e) => onQuickAdd(e, product)}
              className="mt-4 w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
    
  );
}
