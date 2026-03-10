import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import { createProtectedRoute } from "@/app/router/routeHelpers";

const ProductsPage = lazy(() => import("@/features/products/ProductsPage"));
const ProductDetailPage = lazy(() => import("@/features/products/ProductDetailPage"));
const CartPage = lazy(() => import("@/features/products/CartPage"));
const CheckoutPage = lazy(() => import("@/features/products/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("@/features/products/OrderSuccessPage"));
const OrderHistoryPage = lazy(() => import("@/features/products/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("@/features/products/OrderDetailPage"));

export const productRoutes: RouteObject[] = [
  createProtectedRoute("/products", <ProductsPage />),
  createProtectedRoute("/product/:id", <ProductDetailPage />),
  createProtectedRoute("/cart", <CartPage />, { allowGuest: false }),
  createProtectedRoute("/checkout", <CheckoutPage />, { allowGuest: false }),
  createProtectedRoute("/order-success", <OrderSuccessPage />, { allowGuest: false }),
  createProtectedRoute("/orders", <OrderHistoryPage />, { allowGuest: false }),
  createProtectedRoute("/orders/:orderId", <OrderDetailPage />, { allowGuest: false }),
];
