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
): Promise<{ data?: Array<{ id?: string }> }> {
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

  return (await response.json()) as {
    data?: Array<{ id?: string }>;
  };
}

async function probeOpenAIChat(
  requestUrl: string,
  model: string,
  apiKey: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [
          {
            role: "user",
            content: "ping",
          },
        ],
      }),
    });
  } catch (error) {
    throw new Error(
      buildNetworkErrorMessage("OpenAI-compatible", requestUrl, error),
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `OpenAI-compatible 聊天探测失败，状态码 ${response.status}`,
    );
  }
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
    model: activeProviderConfig.defaultModel,
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
    const activeProviderConfig = getActiveProviderConfig(input.config);
    const modelsUrl = `${activeProviderConfig.baseUrl.replace(/\/$/, "")}/models`;
    const chatUrl = `${activeProviderConfig.baseUrl.replace(/\/$/, "")}/chat/completions`;

    try {
      const data = await fetchOpenAIModels(modelsUrl, activeProviderConfig.apiKey);
      const modelCount = data.data?.length ?? 0;
      const firstModel = data.data?.[0]?.id;

      return {
        ok: true,
        message:
          modelCount > 0
            ? `连接成功，已获取 ${modelCount} 个模型。当前可见模型示例：${firstModel ?? activeProviderConfig.defaultModel}`
            : "连接成功，接口已响应。",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const shouldFallback = /404|not found|page not found/i.test(errorMessage);

      if (!shouldFallback) {
        throw error;
      }
    }

    await probeOpenAIChat(
      chatUrl,
      activeProviderConfig.defaultModel,
      activeProviderConfig.apiKey,
    );

    return {
      ok: true,
      message:
        "连接成功。该服务未提供 /models，但聊天接口已通过最小请求探测，当前配置可以用于对话。",
    };
  },

  async listModels(input: ChatRequestInput): Promise<ModelListResult> {
    const activeProviderConfig = getActiveProviderConfig(input.config);
    const requestUrl = `${activeProviderConfig.baseUrl.replace(/\/$/, "")}/models`;

    try {
      const data = await fetchOpenAIModels(requestUrl, activeProviderConfig.apiKey);

      return {
        models: (data.data ?? [])
          .map((item) => item.id?.trim() ?? "")
          .filter(Boolean),
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
