import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import { withSuspense } from "@/app/router/routeHelpers";

const Login = lazy(() => import("@/features/auth/Login"));
const Signup = lazy(() => import("@/features/auth/Signup"));
const VerifyOtp = lazy(() => import("@/features/auth/VerifyOtp"));

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: withSuspense(<Login />),
  },
  {
    path: "/signup",
    element: withSuspense(<Signup />),
  },
  {
    path: "/verify-otp",
    element: withSuspense(<VerifyOtp />),
  },
];
