import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import { createProtectedRoute } from "@/app/router/routeHelpers";

const Home = lazy(() => import("@/pages/Home"));

export const homeRoutes: RouteObject[] = [createProtectedRoute("/", <Home />)];
