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

function buildAnthropicMessagesUrl(baseUrl: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  return normalizedBaseUrl.endsWith("/messages")
    ? normalizedBaseUrl
    : normalizedBaseUrl.endsWith("/v1")
      ? `${normalizedBaseUrl}/messages`
      : `${normalizedBaseUrl}/v1/messages`;
}

function toAnthropicMessages(input: ChatRequestInput) {
  return input.messages
    .filter(
      (message) => message.role === "user" || message.role === "assistant",
    )
    .map((message) => ({
      role: message.role,
      content: [
        {
          type: "text",
          text: message.content,
        },
      ],
    }));
}

function buildAnthropicBody(input: ChatRequestInput, stream: boolean) {
  const activeProviderConfig = getActiveProviderConfig(input.config);
  const parameters = activeProviderConfig.parameters;
  const systemPrompt = parameters.systemPrompt.trim();

  return {
    model: input.selectedModel?.trim() || activeProviderConfig.defaultModel,
    max_tokens: parameters.maxTokens,
    temperature: parameters.temperature,
    top_p: parameters.topP,
    ...(stream ? { stream: true } : {}),
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages: toAnthropicMessages(input),
  };
}

function getAnthropicTextDelta(data: unknown) {
  const chunk = data as {
    type?: string;
    delta?: {
      type?: string;
      text?: string;
    };
  };

  if (chunk.type !== "content_block_delta") {
    return "";
  }

  if (chunk.delta?.type !== "text_delta") {
    return "";
  }

  return chunk.delta.text ?? "";
}

export const anthropicAdapter: ProviderAdapter = {
  type: "anthropic",
  async sendMessage(input: ChatRequestInput): Promise<ChatResponse> {
    const activeProviderConfig = getActiveProviderConfig(input.config);
    const requestUrl = buildAnthropicMessagesUrl(activeProviderConfig.baseUrl);

    let response: Response;

    try {
      response = await fetch(requestUrl, {
        method: "POST",
        signal: input.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": activeProviderConfig.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(buildAnthropicBody(input, false)),
      });
    } catch (error) {
      throw new Error(
        buildNetworkErrorMessage("Anthropic", requestUrl, error),
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Anthropic 请求失败，状态码 ${response.status}`);
    }

    const data = (await response.json()) as {
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    };

    const content = data.content
      ?.filter((item) => item.type === "text" && item.text)
      .map((item) => item.text?.trim() ?? "")
      .join("\n")
      .trim();

    if (!content) {
      throw new Error("Anthropic 响应中没有返回可用内容。");
    }

    return { content };
  },

  async streamMessage(
    input: ChatRequestInput,
    callbacks: StreamChatCallbacks,
  ): Promise<ChatResponse> {
    const activeProviderConfig = getActiveProviderConfig(input.config);
    const requestUrl = buildAnthropicMessagesUrl(activeProviderConfig.baseUrl);
    let response: Response;

    try {
      response = await fetch(requestUrl, {
        method: "POST",
        signal: input.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": activeProviderConfig.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(buildAnthropicBody(input, true)),
      });
    } catch (error) {
      throw new Error(buildNetworkErrorMessage("Anthropic", requestUrl, error));
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || `Anthropic 流式请求失败，状态码 ${response.status}`,
      );
    }

    let content = "";

    await readSseStream(response, (data) => {
      const text = getAnthropicTextDelta(data);

      if (!text) {
        return;
      }

      content += text;
      callbacks.onText(text);
    });

    if (!content.trim()) {
      throw new Error("Anthropic 流式响应中没有返回可用内容。");
    }

    return { content };
  },

  async testConnection(input: ChatRequestInput): Promise<ConnectionTestResult> {
    const activeProviderConfig = getActiveProviderConfig(input.config);
    const requestUrl = buildAnthropicMessagesUrl(activeProviderConfig.baseUrl);

    let response: Response;

    try {
      response = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": activeProviderConfig.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: activeProviderConfig.defaultModel,
          max_tokens: 8,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "ping",
                },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      throw new Error(buildNetworkErrorMessage("Anthropic", requestUrl, error));
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        errorText || `Anthropic 连接测试失败，状态码 ${response.status}`,
      );
    }

    return {
      ok: true,
      message: "连接成功，Anthropic 接口已响应。",
    };
  },

  async listModels(): Promise<ModelListResult> {
    return {
      models: [],
    };
  },
};
