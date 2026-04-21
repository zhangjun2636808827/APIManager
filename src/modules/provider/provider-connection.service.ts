import { getProviderAdapter } from "@/modules/provider/provider-registry";
import type { ConnectionTestResult } from "@/modules/provider/provider.types";
import type { ApiConfig } from "@/types/api-config";

export async function testProviderConnection(
  config: ApiConfig,
): Promise<ConnectionTestResult> {
  const adapter = getProviderAdapter(config.providerType);

  return adapter.testConnection({
    config,
    messages: [],
  });
}
