import type { ProviderType } from "@/types/provider";

export interface ProviderConnectionConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
}

export interface ApiConfig {
  id: string;
  name: string;
  providerType: ProviderType;
  note: string;
  websiteUrl: string;
  openAIConfig: ProviderConnectionConfig;
  anthropicConfig: ProviderConnectionConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ApiConfigDraft {
  name: string;
  providerType: ProviderType;
  note: string;
  websiteUrl: string;
  openAIConfig: ProviderConnectionConfig;
  anthropicConfig: ProviderConnectionConfig;
}

export function createEmptyProviderConnection(): ProviderConnectionConfig {
  return {
    baseUrl: "",
    apiKey: "",
    defaultModel: "",
  };
}

export function cloneProviderConnection(
  config: ProviderConnectionConfig,
): ProviderConnectionConfig {
  return {
    ...config,
  };
}

export function createEmptyApiDraft(): ApiConfigDraft {
  return {
    name: "",
    providerType: "openai-compatible",
    note: "",
    websiteUrl: "",
    openAIConfig: createEmptyProviderConnection(),
    anthropicConfig: createEmptyProviderConnection(),
  };
}

export function cloneApiDraft(config: ApiConfig | ApiConfigDraft): ApiConfigDraft {
  return {
    name: config.name,
    providerType: config.providerType,
    note: config.note,
    websiteUrl: config.websiteUrl,
    openAIConfig: cloneProviderConnection(config.openAIConfig),
    anthropicConfig: cloneProviderConnection(config.anthropicConfig),
  };
}

export function createNewApiDraft(name = "未命名 API"): ApiConfigDraft {
  return {
    ...createEmptyApiDraft(),
    name,
  };
}

export function getActiveProviderConfig(config: ApiConfig | ApiConfigDraft) {
  return config.providerType === "anthropic"
    ? config.anthropicConfig
    : config.openAIConfig;
}
