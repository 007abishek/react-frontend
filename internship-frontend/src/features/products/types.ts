export interface Product {
  id: number;
  title: string;
  price: number;
  category: string;     // 🔴 MUST EXIST
  thumbnail: string;
  images: string[];
}
