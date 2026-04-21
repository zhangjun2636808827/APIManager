import { Globe, KeyRound, Layers3, Link as LinkIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { getActiveProviderConfig, type ApiConfig } from "@/types/api-config";

interface CurrentApiSummaryProps {
  apiConfig: ApiConfig;
  className?: string;
}

function maskApiKey(apiKey: string) {
  if (!apiKey) {
    return "未填写";
  }

  if (apiKey.length <= 8) {
    return "已填写";
  }

  return `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}`;
}

export function CurrentApiSummary({
  apiConfig,
  className,
}: CurrentApiSummaryProps) {
  const activeProviderConfig = getActiveProviderConfig(apiConfig);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Current API
          </p>
          <h3 className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-950">
            {apiConfig.name}
          </h3>
          <p className="mt-2 text-sm text-slate-600">{apiConfig.note || "暂无备注信息"}</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-700">
          {apiConfig.providerType}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            <LinkIcon className="h-3.5 w-3.5" />
            Base URL
          </div>
          <p className="mt-2 break-all text-sm text-slate-900">
            {activeProviderConfig.baseUrl || "未填写"}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            <Layers3 className="h-3.5 w-3.5" />
            Default Model
          </div>
          <p className="mt-2 break-all text-sm text-slate-900">
            {activeProviderConfig.defaultModel || "未填写"}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            <KeyRound className="h-3.5 w-3.5" />
            API Key
          </div>
          <p className="mt-2 break-all text-sm text-slate-900">
            {maskApiKey(activeProviderConfig.apiKey)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
            <Globe className="h-3.5 w-3.5" />
            Website URL
          </div>
          <p className="mt-2 break-all text-sm text-slate-900">
            {apiConfig.websiteUrl || "未填写"}
          </p>
        </div>
      </div>
    </div>
  );
}
