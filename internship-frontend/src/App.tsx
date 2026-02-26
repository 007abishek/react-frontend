import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const Login = lazy(() => import("./features/auth/Login"));
const Signup = lazy(() => import("./features/auth/Signup"));
const Home = lazy(() => import("./pages/Home"));
const TodosPage = lazy(() => import("./features/todos/TodosPage"));
const GithubPage = lazy(() => import("./features/github/GithubPage"));
const ProductsPage = lazy(() => import("./features/products/ProductsPage"));
const ProductDetailPage = lazy(() => import("./features/products/ProductDetailPage"));
const CartPage = lazy(() => import("./features/products/CartPage"));
const CheckoutPage = lazy(() => import("./features/products/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("./features/products/OrderSuccessPage"));
const OrderHistoryPage = lazy(() => import("./features/products/OrderHistoryPage"));
const OrderDetailPage = lazy(() => import("./features/products/OrderDetailPage"));

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/todos"
          element={
            <ProtectedRoute>
              <TodosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/github"
          element={
            <ProtectedRoute>
              <GithubPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/product/:id"
          element={
            <ProtectedRoute>
              <ProductDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <CartPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/order-success"
          element={
            <ProtectedRoute>
              <OrderSuccessPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrderHistoryPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders/:orderId"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
