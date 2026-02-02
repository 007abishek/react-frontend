import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./features/auth/Login";
import Signup from "./features/auth/Signup";

import Home from "./pages/Home";
import TodosPage from "./features/todos/TodosPage";
import GithubPage from "./features/github/GithubPage";
import ProductsPage from "./features/products/ProductsPage";
import CartPage from "./features/products/CartPage";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected */}
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
        path="/cart"
        element={
          <ProtectedRoute>
            <CartPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
