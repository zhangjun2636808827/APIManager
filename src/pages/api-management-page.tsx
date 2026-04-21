import { useEffect, useMemo, useState } from "react";

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
    updateApiConfig,
    removeApiConfig,
    selectApiConfig,
  } = useApiContext();

  const [draft, setDraft] = useState<ApiConfigDraft>(createEmptyApiDraft);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
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

  function handleCreateApi() {
    addApiConfig(createNewApiDraft());
  }

  function handleSubmit() {
    if (!selectedApiId || !draftValidation.isValid) {
      return;
    }

    updateApiConfig(selectedApiId, draft);
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
                OpenAI-compatible 与 Anthropic 连接信息独立保存。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex h-[calc(100%-5rem)] flex-col">
              {selectedApi ? (
                <>
                  <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        当前协议
                      </p>
                      <p className="mt-2 truncate font-medium text-slate-900" title={selectedApi.providerType}>
                        {selectedApi.providerType}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        创建时间
                      </p>
                      <p className="mt-2 truncate font-medium text-slate-900" title={selectedMeta?.createdAt}>
                        {selectedMeta?.createdAt}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        最后更新
                      </p>
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
                    onSubmit={handleSubmit}
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
