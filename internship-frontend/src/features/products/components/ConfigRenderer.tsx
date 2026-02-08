import ProductGrid from "./ProductGrid";

interface Props {
  section: any;
  products: any[];
  onProductClick: (id: number) => void;
  onQuickAdd: (e: React.MouseEvent, product: any) => void;
}

export default function ConfigRenderer({
  section,
  products,
  onProductClick,
  onQuickAdd
}: Props) {
  console.log("✅ ConfigRenderer rendering section:", section);

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
