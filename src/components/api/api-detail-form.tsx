import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Database,
  Eye,
  EyeOff,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  PlugZap,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import { ApiParametersForm } from "@/components/api/api-parameters-form";
import { ApiWebsiteLinksEditor } from "@/components/api/api-website-links-editor";
import { Button } from "@/components/ui/button";
import {
  clearClipboardIfUnchanged,
  copyTextToClipboard,
} from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import type { ApiDraftFieldErrors } from "@/modules/api/api-validation";
import {
  type ApiConfigDraft,
  type ApiWebsiteLink,
  type ChatModelParameters,
} from "@/types/api-config";
import { providerOptions } from "@/types/provider";

interface ApiDetailFormProps {
  value: ApiConfigDraft;
  fieldErrors: ApiDraftFieldErrors;
  isSaveDisabled?: boolean;
  isTestingConnection?: boolean;
  isLoadingModels?: boolean;
  connectionTestMessage?: string | null;
  connectionTestStatus?: "idle" | "success" | "error";
  modelSuggestions?: string[];
  onChange: (nextValue: ApiConfigDraft) => void;
  onTestConnection: () => void;
  onLoadModels: () => void;
}

export function ApiDetailForm({
  value,
  fieldErrors,
  isSaveDisabled,
  isTestingConnection,
  isLoadingModels,
  connectionTestMessage,
  connectionTestStatus = "idle",
  modelSuggestions = [],
  onChange,
  onTestConnection,
  onLoadModels,
}: ApiDetailFormProps) {
  const activeProviderConfig =
    value.providerType === "anthropic"
      ? value.anthropicConfig
      : value.openAIConfig;
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [copyFeedbackStatus, setCopyFeedbackStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const hideTimerRef = useRef<number | null>(null);
  const clearClipboardTimerRef = useRef<number | null>(null);

  function updateField<K extends keyof ApiConfigDraft>(
    key: K,
    fieldValue: ApiConfigDraft[K],
  ) {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  }

  function updateActiveProviderField(
    key: "baseUrl" | "apiKey" | "defaultModel",
    fieldValue: string,
  ) {
    const nextProviderConfig = {
      ...(value.providerType === "anthropic"
        ? value.anthropicConfig
        : value.openAIConfig),
      [key]: fieldValue,
    };

    onChange({
      ...value,
      anthropicConfig:
        value.providerType === "anthropic"
          ? nextProviderConfig
          : value.anthropicConfig,
      openAIConfig:
        value.providerType === "openai-compatible"
          ? nextProviderConfig
          : value.openAIConfig,
    });
  }

  function updateActiveProviderParameters(parameters: ChatModelParameters) {
    const nextProviderConfig = {
      ...(value.providerType === "anthropic"
        ? value.anthropicConfig
        : value.openAIConfig),
      parameters,
    };

    onChange({
      ...value,
      anthropicConfig:
        value.providerType === "anthropic"
          ? nextProviderConfig
          : value.anthropicConfig,
      openAIConfig:
        value.providerType === "openai-compatible"
          ? nextProviderConfig
          : value.openAIConfig,
    });
  }

  function updateWebsiteLinks(websiteLinks: ApiWebsiteLink[]) {
    const primaryUrl =
      websiteLinks.find((link) => link.type === "console" && link.url.trim())
        ?.url ??
      websiteLinks.find((link) => link.url.trim())?.url ??
      "";

    onChange({
      ...value,
      websiteLinks,
      websiteUrl: primaryUrl,
    });
  }

  function getFieldClassName(hasError: boolean) {
    return cn(
      "h-11 rounded-lg border bg-white px-3 text-sm outline-none transition focus:ring-2",
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
        : "border-slate-200 focus:border-slate-400 focus:ring-slate-200",
    );
  }

  function getTextareaClassName(hasError: boolean) {
    return cn(
      "min-h-28 rounded-lg border bg-white px-3 py-3 text-sm outline-none transition focus:ring-2",
      hasError
        ? "border-red-300 focus:border-red-400 focus:ring-red-100"
        : "border-slate-200 focus:border-slate-400 focus:ring-slate-200",
    );
  }

  useEffect(() => {
    setIsApiKeyVisible(false);
    setCopyFeedback(null);
    setCopyFeedbackStatus("idle");
  }, [value.providerType, activeProviderConfig.apiKey]);

  useEffect(() => {
    if (!isApiKeyVisible) {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      return;
    }

    hideTimerRef.current = window.setTimeout(() => {
      setIsApiKeyVisible(false);
    }, 15000);

    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isApiKeyVisible]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      if (clearClipboardTimerRef.current) {
        window.clearTimeout(clearClipboardTimerRef.current);
      }
    };
  }, []);

  async function handleCopyApiKey() {
    if (!activeProviderConfig.apiKey.trim()) {
      setCopyFeedback("当前协议还没有填写 API Key。");
      setCopyFeedbackStatus("error");
      return;
    }

    try {
      await copyTextToClipboard(activeProviderConfig.apiKey);
      setCopyFeedback(
        "API Key 已复制。若剪贴板内容未变化，30 秒后会尝试自动清空。",
      );
      setCopyFeedbackStatus("success");

      if (clearClipboardTimerRef.current) {
        window.clearTimeout(clearClipboardTimerRef.current);
      }

      clearClipboardTimerRef.current = window.setTimeout(() => {
        void clearClipboardIfUnchanged(activeProviderConfig.apiKey);
      }, 30000);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "复制失败，请检查系统剪贴板权限。";
      setCopyFeedback(message);
      setCopyFeedbackStatus("error");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">API 详情</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 [text-wrap:pretty]">
            OpenAI 与 Anthropic 配置独立保存；所有修改会自动保存。
          </p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">自动保存</div>
      </div>

      <div className="mt-6 grid gap-5">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">名称</span>
          <input
            className={getFieldClassName(Boolean(fieldErrors.name))}
            value={value.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="例如：OpenRouter 主账号"
          />
          {fieldErrors.name ? (
            <span className="text-xs text-red-600">{fieldErrors.name}</span>
          ) : null}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">Provider 类型</span>
          <select
            className={getFieldClassName(false)}
            value={value.providerType}
            onChange={(event) => {
              updateField(
                "providerType",
                event.target.value as ApiConfigDraft["providerType"],
              );
            }}
          >
            {providerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-5 text-slate-500">
            {providerOptions.find((option) => option.value === value.providerType)
              ?.description ?? ""}
          </p>
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <Database className="h-4 w-4" />
            当前正在编辑 {value.providerType === "anthropic" ? "Anthropic" : "OpenAI-compatible"} 配置
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            切换到另一种协议后，会显示并保留那一套独立配置。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-800">Base URL</span>
            <input
              className={getFieldClassName(Boolean(fieldErrors.activeBaseUrl))}
              value={activeProviderConfig.baseUrl}
              onChange={(event) =>
                updateActiveProviderField("baseUrl", event.target.value)
              }
              placeholder={
                value.providerType === "anthropic"
                  ? "https://api.anthropic.com 或兼容地址"
                  : "https://api.example.com/v1"
              }
            />
            {fieldErrors.activeBaseUrl ? (
              <span className="text-xs text-red-600">
                {fieldErrors.activeBaseUrl}
              </span>
            ) : null}
          </label>

          <div className="grid gap-2">
            <label className="grid gap-2">
              <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-800">
                默认模型
                <Button
                  type="button"
                  variant="outline"
                  onClick={onLoadModels}
                  disabled={isSaveDisabled || isLoadingModels}
                >
                  {isLoadingModels ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanSearch className="h-4 w-4" />
                  )}
                  拉取模型
                </Button>
              </span>
              <input
                className={getFieldClassName(Boolean(fieldErrors.activeDefaultModel))}
                value={activeProviderConfig.defaultModel}
                onChange={(event) =>
                  updateActiveProviderField("defaultModel", event.target.value)
                }
                placeholder="gpt-4o-mini / claude-3-5-sonnet-latest"
              />
            </label>
            {fieldErrors.activeDefaultModel ? (
              <span className="text-xs text-red-600">
                {fieldErrors.activeDefaultModel}
              </span>
            ) : null}
            {modelSuggestions.length > 0 ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <div className="mb-2 flex items-center justify-between gap-3 px-2">
                    <span className="text-xs font-medium text-slate-700">
                      已拉取模型
                    </span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {modelSuggestions.length} 个
                    </span>
                  </div>
                  <div className="max-h-56 min-w-0 space-y-1 overflow-y-auto pr-1">
                    {modelSuggestions.map((model) => (
                      <button
                        key={model}
                        type="button"
                        className={cn(
                          "flex w-full min-w-0 items-center rounded-lg px-3 py-2 text-left font-mono text-xs transition hover:bg-slate-100",
                          activeProviderConfig.defaultModel === model
                            ? "bg-slate-900 text-white hover:bg-slate-900"
                            : "text-slate-700",
                        )}
                        title={model}
                        onClick={() => updateActiveProviderField("defaultModel", model)}
                      >
                        <span className="min-w-0 truncate">{model}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-xs leading-5 text-slate-500">
                  模型列表固定在表单内部滚动，长模型名会省略显示，悬停可查看完整名称。
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">API Key</span>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type={isApiKeyVisible ? "text" : "password"}
              className={cn(
                getFieldClassName(Boolean(fieldErrors.activeApiKey)),
                "w-full",
              )}
              value={activeProviderConfig.apiKey}
              onChange={(event) =>
                updateActiveProviderField("apiKey", event.target.value)
              }
              placeholder="输入当前协议对应的密钥"
              autoComplete="new-password"
              spellCheck={false}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApiKeyVisible((current) => !current)}
              >
                {isApiKeyVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {isApiKeyVisible ? "隐藏" : "显示"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyApiKey}
              >
                <Copy className="h-4 w-4" />
                复制
              </Button>
            </div>
          </div>
          {fieldErrors.activeApiKey ? (
            <span className="text-xs text-red-600">
              {fieldErrors.activeApiKey}
            </span>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
            <div className="flex items-center gap-2 font-medium text-slate-800">
              <ShieldCheck className="h-4 w-4" />
              API Key 保护措施
            </div>
            <p className="mt-2 [text-wrap:pretty]">
              默认隐藏密钥；显示 15 秒后自动恢复。复制后会尝试在 30 秒后清空剪贴板，如果期间复制了别的内容则不会覆盖。
            </p>
          </div>
          {!copyFeedback ? null : (
            <span
              className={cn(
                "text-xs",
                copyFeedbackStatus === "success"
                  ? "text-emerald-700"
                  : "text-red-600",
              )}
            >
              {copyFeedback}
            </span>
          )}
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">备注信息</span>
          <textarea
            className={getTextareaClassName(false)}
            value={value.note}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="记录用途、额度、账号说明或协议差异"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">AI 描述</span>
          <textarea
            className={getTextareaClassName(false)}
            value={value.aiDescription}
            onChange={(event) => updateField("aiDescription", event.target.value)}
            placeholder="后续测试连接时，可由模型自我介绍并自动填入这里。"
          />
          <span className="text-xs leading-5 text-slate-500">
            用于记录该 API 或模型的能力、适用场景、限制和使用建议。
          </span>
        </label>

        <ApiParametersForm
          value={activeProviderConfig.parameters}
          maxTokensError={fieldErrors.maxTokens}
          onChange={updateActiveProviderParameters}
        />

        <ApiWebsiteLinksEditor
          value={value.websiteLinks}
          error={fieldErrors.websiteLinks ?? fieldErrors.websiteUrl}
          onChange={updateWebsiteLinks}
        />
      </div>

      {!isSaveDisabled ? null : (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          当前配置还有未完成项。至少需要补齐名称，以及当前协议对应的 Base URL、API Key、默认模型；如果配置了网址，也需要是有效链接。
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">连接测试</h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">测试当前配置是否可用，并尝试获取一次模型自我介绍。</p>
        </div>
        <Button type="button" variant="outline" onClick={onTestConnection} disabled={isSaveDisabled || isTestingConnection}>
          {isTestingConnection ? (<LoaderCircle className="h-4 w-4 animate-spin" />) : (<PlugZap className="h-4 w-4" />)}
          测试连接
        </Button>
      </div>

      {!connectionTestMessage ? null : (
        <div
          className={cn(
            "mt-5 rounded-xl border px-4 py-3 text-sm leading-6",
            connectionTestStatus === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {connectionTestMessage}
        </div>
      )}

      {value.lastBenchmark ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-slate-900">
              最近一次测试结果
            </h4>
            <p className="text-xs text-slate-500">
              测试时间：{new Date(value.lastBenchmark.testedAt).toLocaleString()}
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">连接阶段</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {value.lastBenchmark.latencyMs} ms
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">回复耗时</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {value.lastBenchmark.totalMs} ms
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">输出长度</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {value.lastBenchmark.outputChars} 字符
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-500">输出速度</p>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
                {value.lastBenchmark.charsPerSecond ?? 0} 字符/秒
              </p>
            </div>
          </div>
          {value.lastBenchmark.qualitySummary ? (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {value.lastBenchmark.qualitySummary}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
        <Link
          to="/chat"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          <MessageSquareText className="h-4 w-4" />
          使用当前 API 去聊天
        </Link>
        <Link
          to="/webview"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          <ExternalLink className="h-4 w-4" />
          打开当前 API 的内置网页
        </Link>
      </div>
    </div>
  );
}
