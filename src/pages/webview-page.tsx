import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Globe, RefreshCcw, Settings2 } from "lucide-react";

import { CurrentApiSummary } from "@/components/api/current-api-summary";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApiContext } from "@/modules/api/api-context";
import { open } from "@tauri-apps/plugin-shell";

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function WebviewPage() {
  const { selectedApi } = useApiContext();
  const [frameUrl, setFrameUrl] = useState("");
  const [frameKey, setFrameKey] = useState(0);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "loaded">("idle");

  const websiteUrl = selectedApi?.websiteUrl.trim() ?? "";

  useEffect(() => {
    setFrameUrl(websiteUrl);
    setFrameKey((current) => current + 1);
    setLoadState(websiteUrl ? "loading" : "idle");
  }, [selectedApi?.id, websiteUrl]);

  const hasWebsiteUrl = Boolean(websiteUrl);
  const hasValidWebsiteUrl = useMemo(() => isValidHttpUrl(frameUrl), [frameUrl]);

  function handleReload() {
    if (!hasValidWebsiteUrl) {
      return;
    }

    setLoadState("loading");
    setFrameKey((current) => current + 1);
  }

  async function handleOpenInBrowser() {
    if (!hasValidWebsiteUrl) {
      return;
    }

    await open(frameUrl);
  }

  if (!selectedApi) {
    return (
      <section className="w-full">
        <PageHeader
          title="内置网页页"
          description="内置网页页会读取当前选中的 API，并尝试展示该配置中的站点网址。开始前，请先在 API 管理页选中一个配置。"
        />

        <Card className="min-h-[420px]">
          <CardContent className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-950">
              还没有当前 API
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              这个页面不会自己维护目标网址，它依赖当前选中的 API 配置。请先去 API 管理页选择一个 API。
            </p>
            <div className="mt-6">
              <Link to="/api-management">
                <Button>
                  <Settings2 className="h-4 w-4" />
                  去 API 管理页
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="w-full">
      <PageHeader
        title="内置网页页"
        description="这里现在会直接读取当前选中 API 的站点网址，并在应用内加载网页。适合查看控制台、额度、用量或帮助文档。"
      />

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>当前 API</CardTitle>
            <CardDescription>
              内置网页页和聊天页一样，都只依赖全局当前选中的 API。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CurrentApiSummary apiConfig={selectedApi} />
            <Link
              to="/api-management"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
            >
              <Settings2 className="h-4 w-4" />
              返回 API 管理页修改网址
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>内置网页容器</CardTitle>
                <CardDescription>
                  当前目标网址来自所选 API 的 `websiteUrl` 字段。这个区域会在应用内直接加载网页内容。
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleReload} disabled={!hasValidWebsiteUrl}>
                  <RefreshCcw className="h-4 w-4" />
                  刷新网页
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenInBrowser}
                  disabled={!hasValidWebsiteUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                  浏览器打开
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">当前网址</p>
              <p className="mt-2 break-all text-sm text-slate-900">
                {websiteUrl || "未填写"}
              </p>
              {hasWebsiteUrl && !hasValidWebsiteUrl ? (
                <p className="mt-3 text-sm text-red-600">
                  当前网址不是有效的 http 或 https 地址，请回到 API 管理页修正后再加载。
                </p>
              ) : null}
              {hasValidWebsiteUrl ? (
                <p className="mt-3 text-sm text-slate-600">
                  {loadState === "loading"
                    ? "网页正在加载中。如果目标站点禁用了 iframe 嵌入，页面可能无法在此区域显示。"
                    : "如果目标站点设置了 X-Frame-Options 或 CSP，可能会拒绝在内嵌区域显示。这种情况下可以先用右上角按钮在浏览器打开。"}
                </p>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!hasWebsiteUrl ? (
              <div className="flex min-h-[620px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">
                  当前 API 还没有网站网址
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                  请回到 API 管理页，在当前配置中填写站点网址。填写后，这里会直接在应用内加载对应网页。
                </p>
                <div className="mt-6">
                  <Link to="/api-management">
                    <Button>
                      <Settings2 className="h-4 w-4" />
                      去补充网址
                    </Button>
                  </Link>
                </div>
              </div>
            ) : !hasValidWebsiteUrl ? (
              <div className="flex min-h-[620px] flex-col items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-600 shadow-sm">
                  <Globe className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">
                  当前网址格式无效
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                  目前只支持加载 http 或 https 网址。请回到 API 管理页修改后再使用内置网页页。
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <iframe
                  key={frameKey}
                  src={frameUrl}
                  title={`${selectedApi.name} 内置网页`}
                  className="h-[620px] w-full bg-white"
                  onLoad={() => setLoadState("loaded")}
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
