import { fetch } from "@tauri-apps/plugin-http";

import { buildNetworkErrorMessage } from "@/lib/errors";
import { readSseStream } from "@/modules/provider/streaming";
import type {
  ChatRequestInput,
  ChatResponse,
  ConnectionTestResult,
  ModelListResult,
  ProviderAdapter,
  StreamChatCallbacks,
} from "@/modules/provider/provider.types";
import { getActiveProviderConfig } from "@/types/api-config";

async function fetchOpenAIModels(
  requestUrl: string,
  apiKey: string,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
  } catch (error) {
    throw new Error(
      buildNetworkErrorMessage("OpenAI-compatible", requestUrl, error),
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `OpenAI-compatible 连接测试失败，状态码 ${response.status}`,
    );
  }

  return response.json();
}

function buildOpenAIModelsUrl(baseUrl: string, modelListUrl: string) {
  if (modelListUrl.trim()) {
    return modelListUrl.trim();
  }

  try {
    const url = new URL(baseUrl);

    if (url.hostname === "models.github.ai") {
      return "https://models.github.ai/catalog/models";
    }
  } catch {
    // Keep the default fallback below for incomplete URLs while the user edits.
  }

  return `${baseUrl.replace(/\/$/, "")}/models`;
}

function collectModelIds(value: unknown): string[] {
  const models = new Set<string>();

  function visit(item: unknown) {
    if (!item || typeof item !== "object") {
      return;
    }

    const record = item as Record<string, unknown>;

    for (const key of ["id", "name", "model", "modelId"]) {
      const candidate = record[key];

      if (typeof candidate === "string" && candidate.trim()) {
        models.add(candidate.trim());
        return;
      }
    }
  }

  if (Array.isArray(value)) {
    value.forEach(visit);
  } else if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      record.data.forEach(visit);
    }
    if (Array.isArray(record.models)) {
      record.models.forEach(visit);
    }
    if (Array.isArray(record.items)) {
      record.items.forEach(visit);
    }
  }

  return [...models];
}

function getOpenAITextDelta(data: unknown) {
  const chunk = data as {
    choices?: Array<{
      delta?: {
        content?: string;
      };
    }>;
  };

  return chunk.choices?.[0]?.delta?.content ?? "";
}

function buildOpenAIMessages(input: ChatRequestInput) {
  const activeProviderConfig = getActiveProviderConfig(input.config);
  const systemPrompt = activeProviderConfig.parameters.systemPrompt.trim();
  const messages = input.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (!systemPrompt) {
    return messages;
  }

  return [
    {
      role: "system",
      content: systemPrompt,
    },
    ...messages,
  ];
}

function buildOpenAIChatBody(input: ChatRequestInput, stream: boolean) {
  const activeProviderConfig = getActiveProviderConfig(input.config);
  const parameters = activeProviderConfig.parameters;

  return {
    model: input.selectedModel?.trim() || activeProviderConfig.defaultModel,
    ...(stream ? { stream: true } : {}),
    temperature: parameters.temperature,
    top_p: parameters.topP,
    max_tokens: parameters.maxTokens,
    presence_penalty: parameters.presencePenalty,
    frequency_penalty: parameters.frequencyPenalty,
    messages: buildOpenAIMessages(input),
  };
}

export const openAICompatibleAdapter: ProviderAdapter = {
  type: "openai-compatible",
  async sendMessage(input: ChatRequestInput): Promise<ChatResponse> {
    const activeProviderConfig = getActiveProviderConfig(input.config);
    const requestUrl = `${activeProviderConfig.baseUrl.replace(/\/$/, "")}/chat/completions`;

    let response: Response;

    try {
      response = await fetch(requestUrl, {
        method: "POST",
        signal: input.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeProviderConfig.apiKey}`,
        },
        body: JSON.stringify(buildOpenAIChatBody(input, false)),
      });
    } catch (error) {
      throw new Error(
        buildNetworkErrorMessage("OpenAI-compatible", requestUrl, error),
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || `OpenAI-compatible 请求失败，状态码 ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("OpenAI-compatible 响应中没有返回可用内容。");
    }

    return { content };
  },

  async streamMessage(
    input: ChatRequestInput,
    callbacks: StreamChatCallbacks,
  ): Promise<ChatResponse> {
    const activeProviderConfig = getActiveProviderConfig(input.config);
    const requestUrl = `${activeProviderConfig.baseUrl.replace(/\/$/, "")}/chat/completions`;
    let response: Response;

    try {
      response = await fetch(requestUrl, {
        method: "POST",
        signal: input.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeProviderConfig.apiKey}`,
        },
        body: JSON.stringify(buildOpenAIChatBody(input, true)),
      });
    } catch (error) {
      throw new Error(
        buildNetworkErrorMessage("OpenAI-compatible", requestUrl, error),
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || `OpenAI-compatible 流式请求失败，状态码 ${response.status}`,
      );
    }

    let content = "";

    await readSseStream(response, (data) => {
      const text = getOpenAITextDelta(data);

      if (!text) {
        return;
      }

      content += text;
      callbacks.onText(text);
    });

    if (!content.trim()) {
      throw new Error("OpenAI-compatible 流式响应中没有返回可用内容。");
    }

    return { content };
  },

  async testConnection(input: ChatRequestInput): Promise<ConnectionTestResult> {
    return {
      ok: true,
      message: "连接成功，聊天接口已响应。",
    };
  },

  async listModels(input: ChatRequestInput): Promise<ModelListResult> {
    const activeProviderConfig = getActiveProviderConfig(input.config);
    const requestUrl = buildOpenAIModelsUrl(
      activeProviderConfig.baseUrl,
      activeProviderConfig.modelListUrl,
    );

    try {
      const data = await fetchOpenAIModels(requestUrl, activeProviderConfig.apiKey);

      return {
        models: collectModelIds(data),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (/404|not found|page not found/i.test(errorMessage)) {
        return {
          models: [],
        };
      }

      throw error;
    }
  },
};
