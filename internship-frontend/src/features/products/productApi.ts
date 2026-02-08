import { createApi } from "@reduxjs/toolkit/query/react";
import type { Product } from "./types";
import { createBaseQueryWithSentry } from "../../utils/baseQueryWithSentry";

export const productApi = createApi({
  reducerPath: "productApi",

  // ✅ API layer responsibility: fetching + error handling only
  baseQuery: createBaseQueryWithSentry(
    "https://dummyjson.com",
    "product"
  ),

  endpoints: (builder) => ({
    // ✅ Fetch ALL products (no filtering here)
    getProducts: builder.query<Product[], void>({
      query: () => "products",
      transformResponse: (response: { products: Product[] }) =>
        response.products,
    }),

    // ✅ Fetch single product by ID
    getProductById: builder.query<Product, number>({
      query: (id) => `products/${id}`,
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
} = productApi;
