import { Outlet } from "react-router-dom";

import { AppSidebar } from "@/app/layout/sidebar";

export function AppShell() {
  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <AppSidebar />
      <main className="ml-64 h-screen overflow-y-auto overflow-x-hidden">
        <div className="min-h-full bg-app-grid bg-[size:28px_28px]">
          <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-slate-100/80 p-6">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
