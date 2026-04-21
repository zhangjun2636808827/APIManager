import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileKey2, Upload } from "lucide-react";

import { ApiDetailForm } from "@/components/api/api-detail-form";
import { ApiEmptyState } from "@/components/api/api-empty-state";
import { ApiList } from "@/components/api/api-list";
import { PageHeader } from "@/components/common/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatUnknownError } from "@/lib/errors";
import { useApiContext } from "@/modules/api/api-context";
import {
  buildEncryptedExportText,
  buildSafeExportText,
  createExportFileName,
  parseApiImportText,
  saveJsonFileToDesktop,
} from "@/modules/api/api-import-export";
import { validateApiDraft } from "@/modules/api/api-validation";
import { testProviderConnection } from "@/modules/provider/provider-connection.service";
import { listProviderModels } from "@/modules/provider/provider-models.service";
import {
  cloneApiDraft,
  createEmptyApiDraft,
  createNewApiDraft,
  type ApiConfig,
  type ApiConfigDraft,
} from "@/types/api-config";

export function ApiManagementPage() {
  const {
    apiConfigs,
    selectedApi,
    selectedApiId,
    addApiConfig,
    importApiConfigs,
    updateApiConfig,
    removeApiConfig,
    selectApiConfig,
  } = useApiContext();

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<ApiConfigDraft>(createEmptyApiDraft);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [importExportMessage, setImportExportMessage] = useState<string | null>(null);
  const [importExportStatus, setImportExportStatus] = useState<"success" | "error">("success");
  const [connectionTestMessage, setConnectionTestMessage] = useState<string | null>(null);
  const [connectionTestStatus, setConnectionTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);

  const hasApiConfigs = apiConfigs.length > 0;

  useEffect(() => {
    if (!selectedApi) {
      setDraft(createEmptyApiDraft());
      setConnectionTestMessage(null);
      setConnectionTestStatus("idle");
      setModelSuggestions([]);
      return;
    }

    setDraft(cloneApiDraft(selectedApi));
    setConnectionTestMessage(null);
    setConnectionTestStatus("idle");
    setModelSuggestions([]);
  }, [selectedApi]);

  const selectedMeta = useMemo(() => {
    if (!selectedApi) {
      return null;
    }

    return {
      createdAt: new Date(selectedApi.createdAt).toLocaleString(),
      updatedAt: new Date(selectedApi.updatedAt).toLocaleString(),
    };
  }, [selectedApi]);

  const draftValidation = useMemo(() => validateApiDraft(draft), [draft]);

  function showImportExportMessage(message: string, status: "success" | "error") {
    setImportExportMessage(message);
    setImportExportStatus(status);
  }

  function handleCreateApi() {
    addApiConfig(createNewApiDraft());
  }

  async function handleSafeExport() {
    if (apiConfigs.length === 0) {
      showImportExportMessage("当前没有可导出的 API 配置。", "error");
      return;
    }

    try {
      const text = buildSafeExportText(apiConfigs);
      const filePath = await saveJsonFileToDesktop(createExportFileName("safe"), text);
      showImportExportMessage(`已导出脱敏配置文件，不包含 API Key。保存位置：${filePath}`, "success");
    } catch (error) {
      showImportExportMessage(formatUnknownError(error), "error");
    }
  }

  async function handleEncryptedExport() {
    if (apiConfigs.length === 0) {
      showImportExportMessage("当前没有可导出的 API 配置。", "error");
      return;
    }

    const password = window.prompt("请输入加密导出密码。这个密码不会被保存，导入时需要再次输入。");

    if (!password) {
      return;
    }

    try {
      const text = await buildEncryptedExportText(apiConfigs, password);
      const filePath = await saveJsonFileToDesktop(createExportFileName("encrypted"), text);
      showImportExportMessage(`已导出加密配置文件，包含 API Key。保存位置：${filePath}`, "success");
    } catch (error) {
      showImportExportMessage(formatUnknownError(error), "error");
    }
  }

  function handleImportClick() {
    importInputRef.current?.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const looksEncrypted = (() => {
        try {
          const parsed = JSON.parse(text) as { encrypted?: unknown };
          return parsed.encrypted === true;
        } catch {
          return false;
        }
      })();
      const password = looksEncrypted
        ? window.prompt("该配置文件已加密，请输入导出时设置的密码。")
        : undefined;

      if (looksEncrypted && !password) {
        return;
      }

      const result = await parseApiImportText(text, password ?? undefined);
      importApiConfigs(result.apiConfigs);
      showImportExportMessage(
        `导入成功，已合并 ${result.apiConfigs.length} 个 API 配置${
          result.includesApiKeys ? "，包含 API Key" : "，不包含 API Key"
        }。`,
        "success",
      );
    } catch (error) {
      showImportExportMessage(formatUnknownError(error), "error");
    }
  }

  function handleRemove(id: string) {
    const targetApi = apiConfigs.find((item) => item.id === id);

    if (!targetApi) {
      return;
    }

    const confirmed = window.confirm(
      `确定要删除 API 配置“${targetApi.name}”吗？此操作会移除本地保存的连接信息。`,
    );

    if (!confirmed) {
      return;
    }

    removeApiConfig(id);
  }

  function handleDraftChange(nextDraft: ApiConfigDraft) {
    setDraft(nextDraft);

    if (selectedApiId) {
      updateApiConfig(selectedApiId, nextDraft);
    }

    if (connectionTestMessage) {
      setConnectionTestMessage(null);
      setConnectionTestStatus("idle");
    }
    if (nextDraft.providerType !== draft.providerType) {
      setModelSuggestions([]);
    }
  }

  async function handleTestConnection() {
    if (!selectedApi || !draftValidation.isValid || isTestingConnection) {
      return;
    }

    const testConfig: ApiConfig = {
      ...selectedApi,
      ...draft,
      openAIConfig: { ...draft.openAIConfig },
      anthropicConfig: { ...draft.anthropicConfig },
    };

    try {
      setIsTestingConnection(true);
      setConnectionTestMessage(null);
      setConnectionTestStatus("idle");

      const result = await testProviderConnection(testConfig);
      const nextDraft: ApiConfigDraft = {
        ...draft,
        aiDescription: result.selfIntroduction ?? draft.aiDescription,
        lastBenchmark: {
          testedAt: new Date().toISOString(),
          ok: result.ok,
          latencyMs: result.latencyMs ?? 0,
          totalMs: result.totalMs ?? 0,
          outputChars: result.outputChars ?? 0,
          charsPerSecond: result.charsPerSecond,
          prompt: result.prompt ?? "",
          responsePreview: result.responsePreview ?? "",
          selfIntroduction: result.selfIntroduction,
          qualitySummary: result.qualitySummary,
          errorMessage: result.ok ? undefined : result.message,
        },
      };

      setDraft(nextDraft);
      updateApiConfig(selectedApi.id, nextDraft);
      setConnectionTestMessage(result.message);
      setConnectionTestStatus(result.ok ? "success" : "error");
    } catch (error) {
      setConnectionTestMessage(formatUnknownError(error));
      setConnectionTestStatus("error");
    } finally {
      setIsTestingConnection(false);
    }
  }

  async function handleLoadModels() {
    if (!selectedApi || !draftValidation.isValid || isLoadingModels) {
      return;
    }

    const testConfig: ApiConfig = {
      ...selectedApi,
      ...draft,
      openAIConfig: { ...draft.openAIConfig },
      anthropicConfig: { ...draft.anthropicConfig },
    };

    try {
      setIsLoadingModels(true);
      const models = await listProviderModels(testConfig);
      setModelSuggestions(models);
      if (models.length === 0) {
        setConnectionTestMessage("当前 provider 没有返回可用模型列表，你仍然可以手动填写默认模型。");
        setConnectionTestStatus("error");
      } else {
        setConnectionTestMessage(`模型拉取成功，已获取 ${models.length} 个模型建议。`);
        setConnectionTestStatus("success");
      }
    } catch (error) {
      setModelSuggestions([]);
      setConnectionTestMessage(formatUnknownError(error));
      setConnectionTestStatus("error");
    } finally {
      setIsLoadingModels(false);
    }
  }

  return (
    <section className="w-full">
      <PageHeader
        title="API 管理页"
        description="管理多个 API 配置，编辑连接信息，并作为聊天与内置网页的统一入口。"
      />

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">配置备份与迁移</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              可导出配置到桌面 JSON 文件，换电脑后再导入。脱敏导出不含密钥；加密导出包含密钥，需要密码保护。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              onClick={handleImportClick}
            >
              <Upload className="h-4 w-4" />
              导入配置
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              onClick={() => void handleSafeExport()}
            >
              <Download className="h-4 w-4" />
              脱敏导出
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => void handleEncryptedExport()}
            >
              <FileKey2 className="h-4 w-4" />
              加密导出
            </button>
          </div>
        </div>

        {importExportMessage ? (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm leading-6 ${
              importExportStatus === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {importExportMessage}
          </div>
        ) : null}
      </div>

      {!hasApiConfigs ? (
        <ApiEmptyState onCreate={handleCreateApi} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="min-h-[700px]">
            <CardHeader>
              <CardTitle>配置列表</CardTitle>
              <CardDescription>
                选择 API 后在右侧编辑；删除当前项后会自动切换到下一个配置。
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)]">
              <ApiList
                apiConfigs={apiConfigs}
                selectedApiId={selectedApiId}
                onCreate={handleCreateApi}
                onSelect={selectApiConfig}
                onRemove={handleRemove}
              />
            </CardContent>
          </Card>

          <Card className="min-h-[700px]">
            <CardHeader>
              <CardTitle>配置详情</CardTitle>
              <CardDescription>
                OpenAI-compatible 与 Anthropic 连接信息独立保存，修改后自动保存。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-[calc(100%-5rem)] flex-col">
              {selectedApi ? (
                <>
                  <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">当前协议</p>
                      <p className="mt-2 truncate font-medium text-slate-900" title={selectedApi.providerType}>
                        {selectedApi.providerType}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">创建时间</p>
                      <p className="mt-2 truncate font-medium text-slate-900" title={selectedMeta?.createdAt}>
                        {selectedMeta?.createdAt}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">最后更新</p>
                      <p className="mt-2 truncate font-medium text-slate-900" title={selectedMeta?.updatedAt}>
                        {selectedMeta?.updatedAt}
                      </p>
                    </div>
                  </div>

                  <ApiDetailForm
                    value={draft}
                    fieldErrors={draftValidation.fieldErrors}
                    isSaveDisabled={!draftValidation.isValid}
                    isTestingConnection={isTestingConnection}
                    isLoadingModels={isLoadingModels}
                    connectionTestMessage={connectionTestMessage}
                    connectionTestStatus={connectionTestStatus}
                    modelSuggestions={modelSuggestions}
                    onChange={handleDraftChange}
                    onTestConnection={handleTestConnection}
                    onLoadModels={handleLoadModels}
                  />
                </>
              ) : (
                <ApiEmptyState onCreate={handleCreateApi} />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
