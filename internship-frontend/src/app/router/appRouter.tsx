import { createBrowserRouter } from "react-router-dom";

import { authRoutes } from "@/app/router/modules/authRoutes";
import { fallbackRoutes } from "@/app/router/modules/fallbackRoutes";
import { githubRoutes } from "@/app/router/modules/githubRoutes";
import { homeRoutes } from "@/app/router/modules/homeRoutes";
import { productRoutes } from "@/app/router/modules/productRoutes";
import { todoRoutes } from "@/app/router/modules/todoRoutes";

export const appRouter = createBrowserRouter([
  ...authRoutes,
  ...homeRoutes,
  ...todoRoutes,
  ...githubRoutes,
  ...productRoutes,
  ...fallbackRoutes,
]);
