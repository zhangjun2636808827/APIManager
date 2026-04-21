import { Search } from "lucide-react";

import { ApiListItem } from "@/components/api/api-list-item";
import { Button } from "@/components/ui/button";
import type { ApiConfig } from "@/types/api-config";

interface ApiListProps {
  apiConfigs: ApiConfig[];
  selectedApiId: string | null;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ApiList({
  apiConfigs,
  selectedApiId,
  onCreate,
  onSelect,
  onRemove,
}: ApiListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">API 列表</h3>
          <p className="mt-1 text-sm text-slate-600">
            支持 OpenAI-compatible 和 Anthropic 两种协议。
          </p>
        </div>
        <Button onClick={onCreate}>新增 API</Button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span>本阶段先保留列表浏览骨架，后续再补搜索和筛选。</span>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {apiConfigs.map((apiConfig) => (
          <ApiListItem
            key={apiConfig.id}
            apiConfig={apiConfig}
            isSelected={apiConfig.id === selectedApiId}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
