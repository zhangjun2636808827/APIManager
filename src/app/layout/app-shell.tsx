import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AppSidebar } from "@/app/layout/sidebar";
import { cn } from "@/lib/utils";
import { ApiManagementPage } from "@/pages/api-management-page";
import { ChatPage } from "@/pages/chat-page";
import { WebviewPage } from "@/pages/webview-page";

const keepAlivePages = [
  {
    path: "/api-management",
    element: <ApiManagementPage />,
  },
  {
    path: "/chat",
    element: <ChatPage />,
  },
  {
    path: "/webview",
    element: <WebviewPage />,
  },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePath = keepAlivePages.some((page) => page.path === location.pathname)
    ? location.pathname
    : "/api-management";

  useEffect(() => {
    if (location.pathname === "/" || activePath !== location.pathname) {
      navigate("/api-management", { replace: true });
    }
  }, [activePath, location.pathname, navigate]);

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <main className="ml-64 h-screen overflow-hidden">
        <div className="h-full bg-app-grid bg-[size:28px_28px]">
          <div className="relative h-full bg-gradient-to-br from-white via-slate-50 to-slate-100/80">
            {keepAlivePages.map((page) => {
              const isActive = activePath === page.path;

              return (
                <section
                  key={page.path}
                  className={cn(
                    "h-screen overflow-y-auto overflow-x-hidden p-6",
                    isActive ? "block" : "hidden",
                  )}
                >
                  {page.element}
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
