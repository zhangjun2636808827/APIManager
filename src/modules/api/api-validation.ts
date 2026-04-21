import { getActiveProviderConfig, type ApiConfigDraft } from "@/types/api-config";

export interface ApiDraftFieldErrors {
  name?: string;
  activeBaseUrl?: string;
  activeApiKey?: string;
  activeDefaultModel?: string;
  websiteUrl?: string;
  websiteLinks?: string;
  maxTokens?: string;
}

export interface ApiDraftValidationResult {
  isValid: boolean;
  fieldErrors: ApiDraftFieldErrors;
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateApiDraft(
  draft: ApiConfigDraft,
): ApiDraftValidationResult {
  const activeProviderConfig = getActiveProviderConfig(draft);
  const fieldErrors: ApiDraftFieldErrors = {};

  if (!draft.name.trim()) {
    fieldErrors.name = "名称不能为空。";
  }

  if (!activeProviderConfig.baseUrl.trim()) {
    fieldErrors.activeBaseUrl = "当前协议的 Base URL 不能为空。";
  } else if (!isValidHttpUrl(activeProviderConfig.baseUrl.trim())) {
    fieldErrors.activeBaseUrl = "Base URL 必须是有效的 http 或 https 地址。";
  }

  if (!activeProviderConfig.apiKey.trim()) {
    fieldErrors.activeApiKey = "当前协议的 API Key 不能为空。";
  }

  if (!activeProviderConfig.defaultModel.trim()) {
    fieldErrors.activeDefaultModel = "当前协议的默认模型不能为空。";
  }

  if (draft.websiteUrl.trim() && !isValidHttpUrl(draft.websiteUrl.trim())) {
    fieldErrors.websiteUrl = "网站网址必须是有效的 http 或 https 地址。";
  }

  const invalidLink = draft.websiteLinks.find(
    (link) => link.url.trim() && !isValidHttpUrl(link.url.trim()),
  );

  if (invalidLink) {
    fieldErrors.websiteLinks = `“${invalidLink.label || "未命名链接"}”的网址格式无效。`;
  }

  if (activeProviderConfig.parameters.maxTokens < 1) {
    fieldErrors.maxTokens = "Max Tokens 必须大于 0。";
  }

  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}
