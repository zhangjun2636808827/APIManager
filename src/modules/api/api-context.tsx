import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import {
  cloneWebsiteLinks,
  createDefaultChatParameters,
  cloneProviderConnection,
  createEmptyProviderConnection,
  createLegacyWebsiteLink,
  type ApiConfig,
  type ApiConfigDraft,
  type ApiWebsiteLink,
  type ChatModelParameters,
  type ProviderConnectionConfig,
  type WebsiteLinkType,
} from "@/types/api-config";

interface ApiState {
  apiConfigs: ApiConfig[];
  selectedApiId: string | null;
}

type ApiAction =
  | { type: "add"; payload: { draft: ApiConfigDraft } }
  | { type: "import"; payload: { drafts: ApiConfigDraft[] } }
  | { type: "update"; payload: { id: string; draft: ApiConfigDraft } }
  | { type: "remove"; payload: { id: string } }
  | { type: "select"; payload: { id: string | null } };

interface ApiContextValue {
  apiConfigs: ApiConfig[];
  selectedApiId: string | null;
  selectedApi: ApiConfig | null;
  addApiConfig: (draft: ApiConfigDraft) => void;
  importApiConfigs: (drafts: ApiConfigDraft[]) => void;
  updateApiConfig: (id: string, draft: ApiConfigDraft) => void;
  removeApiConfig: (id: string) => void;
  selectApiConfig: (id: string | null) => void;
}

const initialApiConfigs: ApiConfig[] = [
  {
    id: "cfg-openai-compatible",
    name: "OpenAI 兼容示例",
    providerType: "openai-compatible",
    note: "用于 OpenAI-compatible 协议服务商的占位配置。",
    aiDescription: "",
    websiteUrl: "https://platform.example.com",
    websiteLinks: [
      {
        id: "link-openai-console",
        label: "控制台",
        url: "https://platform.example.com",
        type: "console",
      },
    ],
    openAIConfig: {
      baseUrl: "https://api.example.com/v1",
      apiKey: "",
      defaultModel: "gpt-4o-mini",
      modelListUrl: "",
      favoriteModels: ["gpt-4o-mini"],
      parameters: createDefaultChatParameters(),
    },
    anthropicConfig: {
      baseUrl: "https://api.minimaxi.com/anthropic",
      apiKey: "",
      defaultModel: "MiniMax-M1",
      modelListUrl: "",
      favoriteModels: ["MiniMax-M1"],
      parameters: createDefaultChatParameters(),
    },
    createdAt: "2026-04-20T09:00:00.000Z",
    updatedAt: "2026-04-20T09:00:00.000Z",
  },
  {
    id: "cfg-anthropic",
    name: "Anthropic 示例",
    providerType: "anthropic",
    note: "用于 Anthropic Messages API 的占位配置。",
    aiDescription: "",
    websiteUrl: "https://console.anthropic.com",
    websiteLinks: [
      {
        id: "link-anthropic-console",
        label: "控制台",
        url: "https://console.anthropic.com",
        type: "console",
      },
    ],
    openAIConfig: createEmptyProviderConnection(),
    anthropicConfig: {
      baseUrl: "https://api.anthropic.com",
      apiKey: "",
      defaultModel: "claude-3-5-sonnet-latest",
      modelListUrl: "",
      favoriteModels: ["claude-3-5-sonnet-latest"],
      parameters: createDefaultChatParameters(),
    },
    createdAt: "2026-04-20T09:05:00.000Z",
    updatedAt: "2026-04-20T09:05:00.000Z",
  },
];

const storageKey = "api-manager.api-state";

const ApiContext = createContext<ApiContextValue | null>(null);

function createFallbackState(): ApiState {
  return {
    apiConfigs: initialApiConfigs,
    selectedApiId: initialApiConfigs[0]?.id ?? null,
  };
}

function migrateProviderConfig(
  value: unknown,
  fallback?: Partial<ProviderConnectionConfig>,
): ProviderConnectionConfig {
  const record = value && typeof value === "object" ? value : {};
  const data = record as Partial<ProviderConnectionConfig>;

  return {
    baseUrl:
      typeof data.baseUrl === "string" ? data.baseUrl : fallback?.baseUrl ?? "",
    apiKey: typeof data.apiKey === "string" ? data.apiKey : fallback?.apiKey ?? "",
    defaultModel:
      typeof data.defaultModel === "string"
        ? data.defaultModel
        : fallback?.defaultModel ?? "",
    modelListUrl:
      typeof data.modelListUrl === "string"
        ? data.modelListUrl
        : fallback?.modelListUrl ?? "",
    favoriteModels: Array.isArray(data.favoriteModels)
      ? data.favoriteModels
          .filter((model): model is string => typeof model === "string")
          .map((model) => model.trim())
          .filter(Boolean)
      : fallback?.favoriteModels ?? [],
    parameters: migrateChatParameters(data.parameters ?? fallback?.parameters),
  };
}

function migrateChatParameters(value: unknown): ChatModelParameters {
  const defaults = createDefaultChatParameters();
  const record = value && typeof value === "object" ? value : {};
  const data = record as Partial<ChatModelParameters>;

  return {
    temperature:
      typeof data.temperature === "number" ? data.temperature : defaults.temperature,
    topP: typeof data.topP === "number" ? data.topP : defaults.topP,
    maxTokens:
      typeof data.maxTokens === "number" ? data.maxTokens : defaults.maxTokens,
    presencePenalty:
      typeof data.presencePenalty === "number"
        ? data.presencePenalty
        : defaults.presencePenalty,
    frequencyPenalty:
      typeof data.frequencyPenalty === "number"
        ? data.frequencyPenalty
        : defaults.frequencyPenalty,
    stream: typeof data.stream === "boolean" ? data.stream : defaults.stream,
    systemPrompt:
      typeof data.systemPrompt === "string"
        ? data.systemPrompt
        : defaults.systemPrompt,
  };
}

function isWebsiteLinkType(value: unknown): value is WebsiteLinkType {
  return (
    value === "console" ||
    value === "billing" ||
    value === "models" ||
    value === "docs" ||
    value === "usage" ||
    value === "custom"
  );
}

function migrateWebsiteLinks(value: unknown, websiteUrl: string): ApiWebsiteLink[] {
  if (!Array.isArray(value)) {
    return createLegacyWebsiteLink(websiteUrl);
  }

  const links = value
    .map((item): ApiWebsiteLink | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<ApiWebsiteLink>;
      const url = typeof record.url === "string" ? record.url : "";

      if (!url.trim()) {
        return null;
      }

      return {
        id:
          typeof record.id === "string" && record.id.trim()
            ? record.id
            : `link-${crypto.randomUUID()}`,
        label:
          typeof record.label === "string" && record.label.trim()
            ? record.label
            : "链接",
        url,
        type: isWebsiteLinkType(record.type) ? record.type : "custom",
      };
    })
    .filter((item): item is ApiWebsiteLink => Boolean(item));

  return links.length > 0 ? links : createLegacyWebsiteLink(websiteUrl);
}

function migrateApiConfig(value: unknown): ApiConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<ApiConfig> & {
    baseUrl?: string;
    apiKey?: string;
    defaultModel?: string;
  };

  if (typeof record.id !== "string" || typeof record.name !== "string") {
    return null;
  }

  const legacyProviderConfig = {
    baseUrl: typeof record.baseUrl === "string" ? record.baseUrl : "",
    apiKey: typeof record.apiKey === "string" ? record.apiKey : "",
    defaultModel:
      typeof record.defaultModel === "string" ? record.defaultModel : "",
    modelListUrl: "",
    favoriteModels:
      typeof record.defaultModel === "string" && record.defaultModel.trim()
        ? [record.defaultModel.trim()]
        : [],
  };

  return {
    id: record.id,
    name: record.name,
    providerType:
      record.providerType === "anthropic" ? "anthropic" : "openai-compatible",
    note: typeof record.note === "string" ? record.note : "",
    aiDescription:
      typeof record.aiDescription === "string" ? record.aiDescription : "",
    websiteUrl: typeof record.websiteUrl === "string" ? record.websiteUrl : "",
    websiteLinks: migrateWebsiteLinks(
      record.websiteLinks,
      typeof record.websiteUrl === "string" ? record.websiteUrl : "",
    ),
    lastBenchmark:
      record.lastBenchmark && typeof record.lastBenchmark === "object"
        ? record.lastBenchmark
        : undefined,
    openAIConfig: migrateProviderConfig(record.openAIConfig, {
      ...(record.providerType === "openai-compatible"
        ? legacyProviderConfig
        : {}),
    }),
    anthropicConfig: migrateProviderConfig(record.anthropicConfig, {
      ...(record.providerType === "anthropic" ? legacyProviderConfig : {}),
    }),
    createdAt:
      typeof record.createdAt === "string"
        ? record.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof record.updatedAt === "string"
        ? record.updatedAt
        : new Date().toISOString(),
  };
}

function createInitialState(): ApiState {
  if (typeof window === "undefined") {
    return createFallbackState();
  }

  try {
    const rawState = window.localStorage.getItem(storageKey);

    if (!rawState) {
      return createFallbackState();
    }

    const parsedState = JSON.parse(rawState) as Partial<ApiState>;
    const apiConfigs = Array.isArray(parsedState.apiConfigs)
      ? parsedState.apiConfigs
          .map((item) => migrateApiConfig(item))
          .filter((item): item is ApiConfig => Boolean(item))
      : initialApiConfigs;
    const selectedApiId =
      typeof parsedState.selectedApiId === "string"
        ? parsedState.selectedApiId
        : null;
    const hasSelectedApi = apiConfigs.some((item) => item.id === selectedApiId);

    return {
      apiConfigs: apiConfigs.length > 0 ? apiConfigs : initialApiConfigs,
      selectedApiId: hasSelectedApi
        ? selectedApiId
        : (apiConfigs[0]?.id ?? initialApiConfigs[0]?.id ?? null),
    };
  } catch {
    return createFallbackState();
  }
}

function createApiConfig(draft: ApiConfigDraft): ApiConfig {
  const now = new Date().toISOString();

  return {
    id: `api-${crypto.randomUUID()}`,
    ...draft,
    openAIConfig: cloneProviderConnection(draft.openAIConfig),
    anthropicConfig: cloneProviderConnection(draft.anthropicConfig),
    websiteLinks: cloneWebsiteLinks(draft.websiteLinks),
    lastBenchmark: draft.lastBenchmark ? { ...draft.lastBenchmark } : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

function updateApiConfigRecord(current: ApiConfig, draft: ApiConfigDraft): ApiConfig {
  return {
    ...current,
    ...draft,
    openAIConfig: cloneProviderConnection(draft.openAIConfig),
    anthropicConfig: cloneProviderConnection(draft.anthropicConfig),
    websiteLinks: cloneWebsiteLinks(draft.websiteLinks),
    lastBenchmark: draft.lastBenchmark ? { ...draft.lastBenchmark } : undefined,
    updatedAt: new Date().toISOString(),
  };
}

function getNextSelectedApiId(
  apiConfigs: ApiConfig[],
  removedId: string,
  currentSelectedId: string | null,
): string | null {
  if (currentSelectedId !== removedId) {
    return currentSelectedId;
  }

  const nextConfigs = apiConfigs.filter((item) => item.id !== removedId);
  return nextConfigs[0]?.id ?? null;
}

function apiReducer(state: ApiState, action: ApiAction): ApiState {
  switch (action.type) {
    case "add": {
      const nextApi = createApiConfig(action.payload.draft);

      return {
        apiConfigs: [nextApi, ...state.apiConfigs],
        selectedApiId: nextApi.id,
      };
    }

    case "import": {
      const importedConfigs = action.payload.drafts.map((draft) =>
        createApiConfig(draft),
      );

      if (importedConfigs.length === 0) {
        return state;
      }

      return {
        apiConfigs: [...importedConfigs, ...state.apiConfigs],
        selectedApiId: importedConfigs[0]?.id ?? state.selectedApiId,
      };
    }

    case "update": {
      return {
        ...state,
        apiConfigs: state.apiConfigs.map((item) =>
          item.id === action.payload.id
            ? updateApiConfigRecord(item, action.payload.draft)
            : item,
        ),
      };
    }

    case "remove": {
      return {
        apiConfigs: state.apiConfigs.filter(
          (item) => item.id !== action.payload.id,
        ),
        selectedApiId: getNextSelectedApiId(
          state.apiConfigs,
          action.payload.id,
          state.selectedApiId,
        ),
      };
    }

    case "select":
      return {
        ...state,
        selectedApiId: action.payload.id,
      };

    default:
      return state;
  }
}

function persistApiState(state: ApiState) {
  if (typeof window === "undefined") {
    return;
  }

  const serializedState = JSON.stringify(state);
  const currentValue = window.localStorage.getItem(storageKey);

  if (currentValue === serializedState) {
    return;
  }

  window.localStorage.setItem(storageKey, serializedState);
}

interface ApiProviderProps {
  children: ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const [state, dispatch] = useReducer(
    apiReducer,
    undefined,
    createInitialState,
  );

  useEffect(() => {
    persistApiState(state);
  }, [state]);

  const value = useMemo<ApiContextValue>(() => {
    const selectedApi =
      state.apiConfigs.find((item) => item.id === state.selectedApiId) ?? null;

    return {
      apiConfigs: state.apiConfigs,
      selectedApiId: state.selectedApiId,
      selectedApi,
      addApiConfig: (draft) => {
        dispatch({ type: "add", payload: { draft } });
      },
      importApiConfigs: (drafts) => {
        dispatch({ type: "import", payload: { drafts } });
      },
      updateApiConfig: (id, draft) => {
        dispatch({ type: "update", payload: { id, draft } });
      },
      removeApiConfig: (id) => {
        dispatch({ type: "remove", payload: { id } });
      },
      selectApiConfig: (id) => {
        dispatch({ type: "select", payload: { id } });
      },
    };
  }, [state.apiConfigs, state.selectedApiId]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext() {
  const context = useContext(ApiContext);

  if (!context) {
    throw new Error("useApiContext must be used within an ApiProvider");
  }

  return context;
}
