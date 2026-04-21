import type { ApiConfig } from "@/types/api-config";
import type { ChatMessage } from "@/types/chat";
import type { ProviderType } from "@/types/provider";

export interface ChatRequestInput {
  config: ApiConfig;
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string;
}

export interface StreamChatCallbacks {
  onText: (text: string) => void;
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
  totalMs?: number;
  outputChars?: number;
  charsPerSecond?: number;
  prompt?: string;
  responsePreview?: string;
  selfIntroduction?: string;
  qualitySummary?: string;
}

export interface ModelListResult {
  models: string[];
}

export interface ProviderAdapter {
  type: ProviderType;
  sendMessage(input: ChatRequestInput): Promise<ChatResponse>;
  streamMessage(
    input: ChatRequestInput,
    callbacks: StreamChatCallbacks,
  ): Promise<ChatResponse>;
  testConnection(input: ChatRequestInput): Promise<ConnectionTestResult>;
  listModels(input: ChatRequestInput): Promise<ModelListResult>;
}
