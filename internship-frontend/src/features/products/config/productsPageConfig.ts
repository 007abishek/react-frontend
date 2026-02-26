import type { ProductSectionConfig } from "../components/ConfigRenderer";

export const productsPageConfig: {
  configVersion: string;
  sections: ProductSectionConfig[];
} = {
  configVersion: "1.0",
  sections: [
    {
      id: "beauty",
      type: "productGrid",
      title: "💄 Beauty Products",
      enabled: true,
      filter: {
        category: "beauty",
      },
    },
    {
      id: "furniture",
      type: "productGrid",
      title: "🪑 Furniture",
      enabled: true,
      filter: {
        category: "furniture",
      },
    },
    {
      id: "top-rated",
      type: "productGrid",
      title: "⭐ Top Rated Products",
      enabled: true,
      filter: {
        minRating: 4.5,
      },
      
    },

    // {
    //   id: "groceries",
    //   type: "productGrid",
    //   title: "⭐ groceries",
    //   enabled: true,
    //   filter: {
    //     category: "groceries",
    //   },
      
    // },
  ],
};
