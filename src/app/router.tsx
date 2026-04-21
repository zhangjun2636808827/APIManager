import { createHashRouter } from "react-router-dom";

import { AppShell } from "@/app/layout/app-shell";

export const router = createHashRouter([
  {
    path: "/*",
    element: <AppShell />,
  },
]);
