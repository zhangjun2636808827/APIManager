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

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof LinkIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p
        className="min-w-0 truncate text-right font-mono text-[13px] text-slate-900"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export function CurrentApiSummary({
  apiConfig,
  className,
}: CurrentApiSummaryProps) {
  const activeProviderConfig = getActiveProviderConfig(apiConfig);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Current API
          </p>
          <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-slate-950">
            {apiConfig.name}
          </h3>
          <p className="mt-1 truncate text-sm text-slate-600" title={apiConfig.note || "暂无备注信息"}>
            {apiConfig.note || "暂无备注信息"}
          </p>
        </div>
        <span className="max-w-[150px] shrink-0 truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-700">
          {apiConfig.providerType}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        <SummaryRow
          icon={LinkIcon}
          label="Base URL"
          value={activeProviderConfig.baseUrl || "未填写"}
        />
        <SummaryRow
          icon={Layers3}
          label="Model"
          value={activeProviderConfig.defaultModel || "未填写"}
        />
        <SummaryRow
          icon={KeyRound}
          label="API Key"
          value={maskApiKey(activeProviderConfig.apiKey)}
        />
        <SummaryRow
          icon={Globe}
          label="Website"
          value={apiConfig.websiteUrl || "未填写"}
        />
      </div>
    </div>
  );
}
