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
        <ProductGrid
          section={section}
          products={products}
          onProductClick={onProductClick}
          onQuickAdd={onQuickAdd}
        />
      );

    default:
      console.warn("❌ Unsupported section type:", section.type);
      return null;
  }
}

