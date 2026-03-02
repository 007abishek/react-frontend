import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

export const fallbackRoutes: RouteObject[] = [
  {
    path: "*",
    element: <Navigate replace to="/" />,
  },
];
