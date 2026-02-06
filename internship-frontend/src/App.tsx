import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./features/auth/Login";
import Signup from "./features/auth/Signup";

import Home from "./pages/Home";
import TodosPage from "./features/todos/TodosPage";
import GithubPage from "./features/github/GithubPage";

// Product Feature Imports
import ProductsPage from "./features/products/ProductsPage";
import ProductDetailPage from "./features/products/ProductDetailPage";
import CartPage from "./features/products/CartPage";
import CheckoutPage from "./features/products/CheckoutPage";
import OrderSuccessPage from "./features/products/OrderSuccessPage";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
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

      {/* --- Product Related Routes --- */}
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}