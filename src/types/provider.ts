export const providerTypes = ["openai-compatible", "anthropic"] as const;

export type ProviderType = (typeof providerTypes)[number];

export interface ProviderOption {
  value: ProviderType;
  label: string;
  description: string;
}

export const providerOptions: ProviderOption[] = [
  {
    value: "openai-compatible",
    label: "OpenAI-compatible",
    description: "兼容 OpenAI Chat Completions 风格接口的服务商。",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    description: "使用 Anthropic Messages API 协议的服务商。",
  },
];
