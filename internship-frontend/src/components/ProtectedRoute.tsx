import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector } from "@/app/hooks";

interface Props {
  children: ReactNode;
  allowGuest?: boolean;
}

export default function ProtectedRoute({ children, allowGuest = true }: Props) {
  const { isAuthenticated, loading, user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // App is still checking auth (Firebase listener not resolved yet).
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Checking authentication...</p>
      </div>
    );
  }

  // Not authenticated, redirect to login.
  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!allowGuest && user?.provider === "guest") {
    return <Navigate replace state={{ from: location }} to="/products" />;
  }

  // Authenticated, allow access.
  return <>{children}</>;
}
