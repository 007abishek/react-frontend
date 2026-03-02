import { RouterProvider } from "react-router-dom";

import { appRouter } from "@/app/router/appRouter";

export default function App() {
  return <RouterProvider router={appRouter} />;
}
