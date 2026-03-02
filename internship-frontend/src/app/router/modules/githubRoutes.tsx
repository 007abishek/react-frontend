import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import { createProtectedRoute } from "@/app/router/routeHelpers";

const GithubPage = lazy(() => import("@/features/github/GithubPage"));

export const githubRoutes: RouteObject[] = [createProtectedRoute("/github", <GithubPage />)];
