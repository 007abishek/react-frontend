import { Suspense, type ReactElement } from "react";
import type { RouteObject } from "react-router-dom";

import ProtectedRoute from "@/components/ProtectedRoute";

const suspenseFallback = <div className="p-6 text-sm text-slate-500">Loading...</div>;

export const withSuspense = (element: ReactElement) => (
  <Suspense fallback={suspenseFallback}>{element}</Suspense>
);

export const withProtection = (element: ReactElement) => (
  <ProtectedRoute>{element}</ProtectedRoute>
);

export const createProtectedRoute = (path: string, element: ReactElement): RouteObject => ({
  path,
  element: withSuspense(withProtection(element)),
});
