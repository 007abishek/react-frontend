export interface Product {
  id: number;
  title: string;
  description: string; // ✅ REQUIRED for ProductDetailPage
  price: number;
  category: string;

  // DummyJSON fields
  thumbnail: string;
  images: string[];
  rating: number; // DummyJSON uses number, not object
}

// Cart item extends Product
export interface CartItem extends Product {
  quantity: number;
}
