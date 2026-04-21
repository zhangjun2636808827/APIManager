import { getProviderAdapter } from "@/modules/provider/provider-registry";
import type {
  ChatRequestInput,
  ChatResponse,
  StreamChatCallbacks,
} from "@/modules/provider/provider.types";
import { getActiveProviderConfig } from "@/types/api-config";

function validateChatInput(input: ChatRequestInput) {
  const activeProviderConfig = getActiveProviderConfig(input.config);

  if (!activeProviderConfig.baseUrl.trim()) {
    throw new Error("当前 API 未填写 Base URL。");
  }

  if (!activeProviderConfig.apiKey.trim()) {
    throw new Error("当前 API 未填写 API Key。");
  }

  if (!activeProviderConfig.defaultModel.trim()) {
    throw new Error("当前 API 未填写默认模型。");
  }
}

export async function sendChatMessage(
  input: ChatRequestInput,
): Promise<ChatResponse> {
  validateChatInput(input);

  const adapter = getProviderAdapter(input.config.providerType);
  return adapter.sendMessage(input);
}

export async function streamChatMessage(
  input: ChatRequestInput,
  callbacks: StreamChatCallbacks,
): Promise<ChatResponse> {
  validateChatInput(input);

  const adapter = getProviderAdapter(input.config.providerType);
  return adapter.streamMessage(input, callbacks);
}
