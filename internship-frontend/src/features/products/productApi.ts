import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import type { Product } from "./types";
import { fetchProductById, fetchProducts } from "./hasuraCommerce";

export const productApi = createApi({
  reducerPath: "productApi",
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      queryFn: async () => {
        try {
          const products = await fetchProducts();
          return { data: products };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: String(error) } };
        }
      },
    }),
    getProductById: builder.query<Product, number>({
      queryFn: async (id) => {
        try {
          const product = await fetchProductById(id);
          if (!product) {
            return { error: { status: 404, error: "Product not found" } };
          }
          return { data: product };
        } catch (error) {
          return { error: { status: "CUSTOM_ERROR", error: String(error) } };
        }
      },
    }),
  }),
});

export const { useGetProductsQuery, useGetProductByIdQuery } = productApi;
