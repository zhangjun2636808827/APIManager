import { CheckCircle2, Globe, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getActiveProviderConfig,
  getPrimaryWebsiteUrl,
  type ApiConfig,
} from "@/types/api-config";

interface ApiListItemProps {
  apiConfig: ApiConfig;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ApiListItem({
  apiConfig,
  isSelected,
  onSelect,
  onRemove,
}: ApiListItemProps) {
  const activeProviderConfig = getActiveProviderConfig(apiConfig);
  const primaryWebsiteUrl = getPrimaryWebsiteUrl(apiConfig);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        isSelected
          ? "border-slate-900 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onSelect(apiConfig.id)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{apiConfig.name}</h3>
              {isSelected ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
              ) : null}
            </div>
            <p
              className={cn(
                "mt-1 text-xs uppercase tracking-[0.18em]",
                isSelected ? "text-slate-300" : "text-slate-500",
              )}
            >
              {apiConfig.providerType}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 rounded-lg border px-3 py-2 text-xs",
            isSelected
              ? "border-slate-800 bg-slate-900 text-slate-300"
              : "border-slate-200 bg-slate-50 text-slate-600",
          )}
        >
          <p className="truncate">
            Base URL: {activeProviderConfig.baseUrl || "未填写"}
          </p>
          <p className="mt-1 truncate">
            默认模型: {activeProviderConfig.defaultModel || "未填写"}
          </p>
        </div>
      </button>

      <div className="mt-4 flex items-center justify-between gap-2">
        <div
          className={cn(
            "inline-flex items-center gap-1 text-xs",
            isSelected ? "text-slate-300" : "text-slate-500",
          )}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="truncate">
            {primaryWebsiteUrl ? "已配置站点网址" : "未配置站点网址"}
          </span>
        </div>

        <Button
          variant={isSelected ? "secondary" : "ghost"}
          size="sm"
          onClick={() => onRemove(apiConfig.id)}
        >
          <Trash2 className="h-4 w-4" />
          删除
        </Button>
      </div>
    </div>
  );
}
