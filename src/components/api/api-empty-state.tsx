import { DatabaseZap } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ApiEmptyStateProps {
  onCreate: () => void;
}

export function ApiEmptyState({ onCreate }: ApiEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
        <DatabaseZap className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">
        还没有 API 配置
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
        先创建一个 API 配置，然后就可以选择它进入聊天页，或在内置网页页查看控制台和用量信息。
      </p>
      <Button className="mt-5" onClick={onCreate}>
        新建第一个 API
      </Button>
    </div>
  );
}
