import { Navigate } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, loading } = useAppSelector(
    (state) => state.auth
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
