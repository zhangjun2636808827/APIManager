import type { ProviderType } from "@/types/provider";

export type WebsiteLinkType =
  | "console"
  | "billing"
  | "models"
  | "docs"
  | "usage"
  | "custom";

export interface ApiWebsiteLink {
  id: string;
  label: string;
  url: string;
  type: WebsiteLinkType;
}

export interface ChatModelParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
  stream: boolean;
  systemPrompt: string;
}

export interface ApiBenchmarkResult {
  testedAt: string;
  ok: boolean;
  latencyMs: number;
  totalMs: number;
  firstTokenMs?: number;
  outputChars: number;
  charsPerSecond?: number;
  prompt: string;
  responsePreview: string;
  selfIntroduction?: string;
  qualitySummary?: string;
  errorMessage?: string;
}

export interface ProviderConnectionConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  modelListUrl: string;
  favoriteModels: string[];
  parameters: ChatModelParameters;
}

export interface ApiConfig {
  id: string;
  name: string;
  providerType: ProviderType;
  note: string;
  aiDescription: string;
  websiteUrl: string;
  websiteLinks: ApiWebsiteLink[];
  lastBenchmark?: ApiBenchmarkResult;
  openAIConfig: ProviderConnectionConfig;
  anthropicConfig: ProviderConnectionConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ApiConfigDraft {
  name: string;
  providerType: ProviderType;
  note: string;
  aiDescription: string;
  websiteUrl: string;
  websiteLinks: ApiWebsiteLink[];
  lastBenchmark?: ApiBenchmarkResult;
  openAIConfig: ProviderConnectionConfig;
  anthropicConfig: ProviderConnectionConfig;
}

export function createDefaultChatParameters(): ChatModelParameters {
  return {
    temperature: 0.7,
    topP: 1,
    maxTokens: 1024,
    presencePenalty: 0,
    frequencyPenalty: 0,
    stream: true,
    systemPrompt: "You are a helpful assistant.",
  };
}

export function createEmptyProviderConnection(): ProviderConnectionConfig {
  return {
    baseUrl: "",
    apiKey: "",
    defaultModel: "",
    modelListUrl: "",
    favoriteModels: [],
    parameters: createDefaultChatParameters(),
  };
}

export function cloneChatParameters(
  parameters: ChatModelParameters,
): ChatModelParameters {
  return {
    ...createDefaultChatParameters(),
    ...parameters,
  };
}

export function cloneProviderConnection(
  config: ProviderConnectionConfig,
): ProviderConnectionConfig {
  return {
    ...createEmptyProviderConnection(),
    ...config,
    favoriteModels: Array.isArray(config.favoriteModels)
      ? [...config.favoriteModels]
      : [],
    parameters: cloneChatParameters(config.parameters),
  };
}

export function createWebsiteLink(
  type: WebsiteLinkType = "custom",
): ApiWebsiteLink {
  return {
    id: `link-${crypto.randomUUID()}`,
    label: "",
    url: "",
    type,
  };
}

export function createLegacyWebsiteLink(websiteUrl: string): ApiWebsiteLink[] {
  const url = websiteUrl.trim();

  if (!url) {
    return [];
  }

  return [
    {
      id: `link-${crypto.randomUUID()}`,
      label: "控制台",
      url,
      type: "console",
    },
  ];
}

export function cloneWebsiteLinks(links: ApiWebsiteLink[]): ApiWebsiteLink[] {
  return links.map((link) => ({ ...link }));
}

export function getPrimaryWebsiteUrl(config: ApiConfig | ApiConfigDraft) {
  const preferredLink =
    config.websiteLinks.find((link) => link.type === "console" && link.url.trim()) ??
    config.websiteLinks.find((link) => link.url.trim());

  return preferredLink?.url.trim() || config.websiteUrl.trim();
}

export function createEmptyApiDraft(): ApiConfigDraft {
  return {
    name: "",
    providerType: "openai-compatible",
    note: "",
    aiDescription: "",
    websiteUrl: "",
    websiteLinks: [],
    openAIConfig: createEmptyProviderConnection(),
    anthropicConfig: createEmptyProviderConnection(),
  };
}

export function cloneApiDraft(config: ApiConfig | ApiConfigDraft): ApiConfigDraft {
  return {
    name: config.name,
    providerType: config.providerType,
    note: config.note,
    aiDescription: config.aiDescription,
    websiteUrl: config.websiteUrl,
    websiteLinks: cloneWebsiteLinks(config.websiteLinks),
    lastBenchmark: config.lastBenchmark ? { ...config.lastBenchmark } : undefined,
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
