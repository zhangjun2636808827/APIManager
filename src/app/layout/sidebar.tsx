import { Bot, Globe, KeySquare } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const navItems = [
  {
    to: "/api-management",
    label: "API 管理",
    icon: KeySquare,
  },
  {
    to: "/chat",
    label: "聊天",
    icon: Bot,
  },
  {
    to: "/webview",
    label: "内置网页",
    icon: Globe,
  },
];

export function AppSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
          Desktop Tool
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          API Manager
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          管理大模型接口与桌面聊天入口
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-950"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white",
                )
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
        MVP 骨架版本
      </div>
    </aside>
  );
}
