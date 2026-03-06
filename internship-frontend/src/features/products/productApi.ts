import { gql, useQuery } from "@apollo/client";
import type { Product } from "./types";

const GET_PRODUCTS = gql`
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
`;

const GET_PRODUCT_BY_ID = gql`
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
`;

type ProductRow = Product;

function normalizeProduct(product: ProductRow): Product {
  return {
    ...product,
    price: Number(product.price),
    rating: Number(product.rating),
    stock: Number(product.stock),
  };
}

export function useGetProductsQuery(): {
  data?: Product[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
} {
  const { data, loading, error } = useQuery<{ products: ProductRow[] }>(GET_PRODUCTS);

  return {
    data: data?.products.map(normalizeProduct),
    isLoading: loading,
    isError: Boolean(error),
    error,
  };
}

export function useGetProductByIdQuery(
  id: number,
  options?: { skip?: boolean }
): {
  data?: Product | null;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
} {
  const { data, loading, error } = useQuery<{ products_by_pk: ProductRow | null }>(GET_PRODUCT_BY_ID, {
    variables: { id },
    skip: options?.skip ?? false,
  });

  return {
    data: data?.products_by_pk ? normalizeProduct(data.products_by_pk) : data?.products_by_pk ?? undefined,
    isLoading: loading,
    isError: Boolean(error),
    error,
  };
}
