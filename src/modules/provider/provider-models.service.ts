import { getProviderAdapter } from "@/modules/provider/provider-registry";
import type { ApiConfig } from "@/types/api-config";

export async function listProviderModels(config: ApiConfig): Promise<string[]> {
  const adapter = getProviderAdapter(config.providerType);
  const result = await adapter.listModels({
    config,
    messages: [],
  });

  return result.models;
}
