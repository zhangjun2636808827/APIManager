import { createHashRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/app/layout/app-shell";
import { ApiManagementPage } from "@/pages/api-management-page";
import { ChatPage } from "@/pages/chat-page";
import { WebviewPage } from "@/pages/webview-page";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/api-management" replace />,
      },
      {
        path: "api-management",
        element: <ApiManagementPage />,
      },
      {
        path: "chat",
        element: <ChatPage />,
      },
      {
        path: "webview",
        element: <WebviewPage />,
      },
    ],
  },
]);
