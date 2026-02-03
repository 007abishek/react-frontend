import { createApi } from "@reduxjs/toolkit/query/react";
import type { Product } from "./types";
import { createBaseQueryWithSentry } from "../../utils/baseQueryWithSentry";

export const productApi = createApi({
  reducerPath: "productApi",

  baseQuery: createBaseQueryWithSentry(
    "https://dummyjson.com",
    "product"
  ),

  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => "products",

      transformResponse: (response: {
        products: Product[];
      }) => {
        // ✅ Electronics-like categories
        const electronicsCategories = [
          "smartphones",
          "laptops",
          "lighting",
          "automotive",
          "motorcycle",
          "home-decoration",
        ];

        const filtered = response.products.filter(
          (p) =>
            p.category &&
            electronicsCategories.includes(p.category)
        );

        // ✅ SAFETY FALLBACK (IMPORTANT)
        return filtered.length > 0
          ? filtered
          : response.products;
      },
    }),
  }),
});

export const { useGetProductsQuery } = productApi;
