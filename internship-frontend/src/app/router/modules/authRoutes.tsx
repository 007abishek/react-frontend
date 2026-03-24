import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import { withSuspense } from "@/app/router/routeHelpers";
//load components only when needed instead of load everything (lazy)
const Login = lazy(() => import("@/features/auth/Login"));
const Signup = lazy(() => import("@/features/auth/Signup"));

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: withSuspense(<Login />),
  },
  {
    path: "/signup",
    element: withSuspense(<Signup />),
  },
 
];
