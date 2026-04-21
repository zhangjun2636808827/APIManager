import { anthropicAdapter } from "@/modules/provider/anthropic.adapter";
import { openAICompatibleAdapter } from "@/modules/provider/openai-compatible.adapter";
import type { ProviderAdapter } from "@/modules/provider/provider.types";
import type { ProviderType } from "@/types/provider";

const adapters: Record<ProviderType, ProviderAdapter> = {
  "openai-compatible": openAICompatibleAdapter,
  anthropic: anthropicAdapter,
};

export function getProviderAdapter(providerType: ProviderType): ProviderAdapter {
  return adapters[providerType];
}
