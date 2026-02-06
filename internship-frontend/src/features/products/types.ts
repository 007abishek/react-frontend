export interface Product {
  id: number;
  title: string;
  price: number;
  category: string;
  thumbnail: string;
  images: string[];
}

// Create a separate type for the Cart
export interface CartItem extends Product {
  quantity: number;
}