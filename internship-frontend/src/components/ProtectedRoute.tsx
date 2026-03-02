import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAppSelector } from "@/app/hooks";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
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

  // Authenticated, allow access.
  return <>{children}</>;
}