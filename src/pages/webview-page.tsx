import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Globe,
  MonitorUp,
  RefreshCcw,
  Settings2,
} from "lucide-react";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { open } from "@tauri-apps/plugin-shell";

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
import {
  getPrimaryWebsiteUrl,
  type ApiWebsiteLink,
  type WebsiteLinkType,
} from "@/types/api-config";

const websiteLinkTypeLabels: Record<WebsiteLinkType, string> = {
  console: "控制台",
  billing: "账单页",
  usage: "用量页",
  models: "模型页",
  docs: "文档页",
  custom: "自定义",
};

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function getConsoleWindowLabel(apiId: string) {
  return `provider-console-${apiId.replace(/[^a-zA-Z0-9-_:]/g, "-")}`;
}

function getLinkTypeLabel(link: ApiWebsiteLink) {
  if (link.type === "custom") {
    return link.label.trim() || "自定义";
  }

  return websiteLinkTypeLabels[link.type] ?? "链接";
}

export function WebviewPage() {
  const { selectedApi } = useApiContext();
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "loaded">(
    "idle",
  );

  const websiteLinks = useMemo(() => {
    if (!selectedApi) {
      return [];
    }

    if (selectedApi.websiteLinks.length > 0) {
      return selectedApi.websiteLinks;
    }

    const primaryUrl = getPrimaryWebsiteUrl(selectedApi);
    return primaryUrl
      ? [
          {
            id: "legacy-website-url",
            label: "",
            url: primaryUrl,
            type: "console" as const,
          },
        ]
      : [];
  }, [selectedApi]);

  const selectedLink = useMemo(() => {
    return (
      websiteLinks.find((link) => link.id === selectedLinkId) ??
      websiteLinks.find((link) => link.type === "console") ??
      websiteLinks[0] ??
      null
    );
  }, [selectedLinkId, websiteLinks]);

  const frameUrl = selectedLink?.url.trim() ?? "";
  const hasWebsiteUrl = Boolean(frameUrl);
  const hasValidWebsiteUrl = useMemo(() => isValidHttpUrl(frameUrl), [frameUrl]);

  useEffect(() => {
    const nextLink =
      websiteLinks.find((link) => link.type === "console") ??
      websiteLinks[0] ??
      null;

    setSelectedLinkId(nextLink?.id ?? null);
  }, [selectedApi?.id, websiteLinks]);

  useEffect(() => {
    setFrameKey((current) => current + 1);
    setLoadState(frameUrl ? "loading" : "idle");
  }, [frameUrl]);

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

  async function handleOpenInAppWindow() {
    if (!selectedApi || !hasValidWebsiteUrl) {
      return;
    }

    const label = getConsoleWindowLabel(selectedApi.id);
    const existingWindow = await WebviewWindow.getByLabel(label);

    if (existingWindow) {
      await existingWindow.close();
    }

    const providerWindow = new WebviewWindow(label, {
      url: frameUrl,
      title: `${selectedApi.name} ${selectedLink ? getLinkTypeLabel(selectedLink) : "网页"}`,
      width: 1280,
      height: 860,
      minWidth: 980,
      minHeight: 680,
      resizable: true,
      center: true,
    });

    providerWindow.once("tauri://error", (event) => {
      console.error("创建应用内网页窗口失败", event.payload);
    });
  }

  if (!selectedApi) {
    return (
      <section className="w-full">
        <PageHeader
          title="内置网页页"
          description="内置网页页读取当前 API 的常用网址。开始前，请先选择一个配置。"
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
              这个页面依赖当前 API 的网址配置。请先去 API 管理页选择配置。
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
        description="在应用内打开当前 API 的控制台、余额、用量、模型或文档页面。"
      />

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>当前 API</CardTitle>
            <CardDescription>
              与聊天页一致，只依赖全局当前 API。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CurrentApiSummary apiConfig={selectedApi} />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                网址入口
              </p>
              <div className="mt-3 grid gap-2">
                {websiteLinks.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-600">
                    当前 API 还没有配置常用网址。
                  </p>
                ) : null}

                {websiteLinks.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    className={`min-w-0 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedLink?.id === link.id
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                    onClick={() => setSelectedLinkId(link.id)}
                  >
                    <span className="block truncate font-medium">
                      {getLinkTypeLabel(link)}
                    </span>
                    <span className="mt-1 block truncate font-mono text-xs opacity-75">
                      {link.url || "未填写网址"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

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
                  目标网址来自当前 API 的常用网址配置。
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleReload}
                  disabled={!hasValidWebsiteUrl}
                >
                  <RefreshCcw className="h-4 w-4" />
                  刷新网页
                </Button>
                <Button
                  type="button"
                  onClick={handleOpenInAppWindow}
                  disabled={!hasValidWebsiteUrl}
                >
                  <MonitorUp className="h-4 w-4" />
                  应用内窗口打开
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenInBrowser}
                  disabled={!hasValidWebsiteUrl}
                >
                  <ExternalLink className="h-4 w-4" />
                  系统浏览器打开
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                当前网址
              </p>
              {selectedLink ? (
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {getLinkTypeLabel(selectedLink)}
                </p>
              ) : null}
              <p
                className="mt-2 truncate font-mono text-sm text-slate-900"
                title={frameUrl || "未填写"}
              >
                {frameUrl || "未填写"}
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
                    : "若站点禁止 iframe 嵌入，可使用应用内窗口打开，仍然不必跳到系统浏览器。"}
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
                  当前 API 还没有网址
                </h3>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                  请回到 API 管理页添加控制台、余额、模型、账单或文档入口。
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
