import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import { createProtectedRoute } from "@/app/router/routeHelpers";

const TodosPage = lazy(() => import("@/features/todos/TodosPage"));

export const todoRoutes: RouteObject[] = [createProtectedRoute("/todos", <TodosPage />)];
