import ProductGrid from "./ProductGrid";
import type { Product } from "../types";

export interface ProductSectionConfig {
  id: string;
  type: "productGrid";
  title: string;
  enabled: boolean;
  filter?: {
    category?: string;
    minRating?: number;
  };
}

interface Props {
  section: ProductSectionConfig;
  products: Product[];
  onProductClick: (id: number) => void;
  onQuickAdd: (e: React.MouseEvent, product: Product) => void;
}

export default function ConfigRenderer({
  section,
  products,
  onProductClick,
  onQuickAdd
}: Props) {
  switch (section.type) {
    case "productGrid":
      return (
        <section
          className="
            mb-8 
            sm:mb-10 
            lg:mb-12
            px-2 
            sm:px-0
          "
        >
          <ProductGrid
            section={section}
            products={products}
            onProductClick={onProductClick}
            onQuickAdd={onQuickAdd}
          />
        </section>
      );

    default:
      console.warn("❌ Unsupported section type:", section.type);
      return null;
  }
}