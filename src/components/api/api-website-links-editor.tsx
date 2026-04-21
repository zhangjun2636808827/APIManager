import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  createWebsiteLink,
  type ApiWebsiteLink,
  type WebsiteLinkType,
} from "@/types/api-config";

interface ApiWebsiteLinksEditorProps {
  value: ApiWebsiteLink[];
  error?: string;
  onChange: (nextValue: ApiWebsiteLink[]) => void;
}

const websiteLinkTypes: Array<{ value: WebsiteLinkType; label: string }> = [
  { value: "console", label: "控制台" },
  { value: "billing", label: "账单页" },
  { value: "usage", label: "用量页" },
  { value: "models", label: "模型页" },
  { value: "docs", label: "文档页" },
  { value: "custom", label: "自定义" },
];

function getTypeLabel(type: WebsiteLinkType) {
  return websiteLinkTypes.find((item) => item.value === type)?.label ?? "链接";
}

function getDisplayType(link: ApiWebsiteLink) {
  return link.type === "custom" ? link.label.trim() || "自定义" : getTypeLabel(link.type);
}

export function ApiWebsiteLinksEditor({
  value,
  error,
  onChange,
}: ApiWebsiteLinksEditorProps) {
  function addLink(type: WebsiteLinkType = "custom") {
    const nextLink = createWebsiteLink(type);

    nextLink.label = type === "custom" ? "自定义" : "";
    onChange([...value, nextLink]);
  }

  function updateLink(id: string, patch: Partial<ApiWebsiteLink>) {
    onChange(
      value.map((link) =>
        link.id === id
          ? {
              ...link,
              ...patch,
            }
          : link,
      ),
    );
  }

  function removeLink(id: string) {
    onChange(value.filter((link) => link.id !== id));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">常用网址</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            每个 API 可以配置多个入口。入口只需要选择类型；如果选择自定义，可以直接填写自定义类型名。
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => addLink("custom")}>
          <Plus className="h-4 w-4" />
          添加网址
        </Button>
      </div>

      <div className="mt-4 grid gap-3">
        {value.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            还没有配置网址。添加后，内置网页页会按类型展示这些入口。
          </div>
        ) : null}

        {value.map((link) => (
          <div
            key={link.id}
            className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 xl:grid-cols-[180px_minmax(0,1fr)_auto]"
          >
            <div className="grid min-w-0 gap-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-slate-600">类型</span>
                <select
                  className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={link.type}
                  onChange={(event) => {
                    const type = event.target.value as WebsiteLinkType;
                    updateLink(link.id, {
                      type,
                      label: type === "custom" ? link.label || "自定义" : "",
                    });
                  }}
                >
                  {websiteLinkTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {link.type === "custom" ? (
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-slate-600">自定义类型</span>
                  <input
                    className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    value={link.label}
                    onChange={(event) =>
                      updateLink(link.id, { label: event.target.value })
                    }
                    placeholder="例如：余额页"
                  />
                </label>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-500">
                  内置网页页将显示为：
                  <span className="ml-1 font-medium text-slate-800">
                    {getDisplayType(link)}
                  </span>
                </div>
              )}
            </div>

            <label className="grid min-w-0 gap-1">
              <span className="text-xs font-medium text-slate-600">网址</span>
              <input
                className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={link.url}
                onChange={(event) =>
                  updateLink(link.id, { url: event.target.value })
                }
                placeholder="https://example.com"
              />
            </label>

            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeLink(link.id)}
              >
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            </div>
          </div>
        ))}
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </section>
  );
}
