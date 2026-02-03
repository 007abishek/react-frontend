import { createApi } from "@reduxjs/toolkit/query/react";
import type { Product } from "./types";
import { createBaseQueryWithSentry } from "../../utils/baseQueryWithSentry";

export const productApi = createApi({
  reducerPath: "productApi",

  // ✅ Sentry-enabled baseQuery (error monitoring only)
  baseQuery: createBaseQueryWithSentry(
    "https://fakestoreapi.com/",
    "product"
  ),

  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => "products",
    }),
  }),
});

export const { useGetProductsQuery } = productApi;
