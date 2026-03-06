import { hasuraRequest } from "../../../utils/hasuraClient";
import type { Product } from "../types";
import type { ProductRow } from "./types";

function normalizeProduct(product: ProductRow): Product {
  return {
    ...product,
    price: Number(product.price),
    rating: Number(product.rating),
    stock: Number(product.stock),
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const data = await hasuraRequest<{ products: ProductRow[] }>(
    `
      query GetProducts {
        products(order_by: { id: asc }) {
          id
          title
          description
          price
          category
          thumbnail
          images
          rating
          stock
        }
      }
    `
  );

  return data.products.map(normalizeProduct);
}

export async function fetchProductById(id: number): Promise<Product | null> {
  const data = await hasuraRequest<{ products_by_pk: ProductRow | null }>(
    `
      query GetProductById($id: Int!) {
        products_by_pk(id: $id) {
          id
          title
          description
          price
          category
          thumbnail
          images
          rating
          stock
        }
      }
    `,
    { id }
  );

  return data.products_by_pk ? normalizeProduct(data.products_by_pk) : null;
}
