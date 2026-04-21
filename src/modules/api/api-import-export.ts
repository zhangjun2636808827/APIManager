import {
  cloneApiDraft,
  createEmptyApiDraft,
  createWebsiteLink,
  type ApiConfig,
  type ApiConfigDraft,
  type ApiWebsiteLink,
  type ProviderConnectionConfig,
  type WebsiteLinkType,
} from "@/types/api-config";
import type { ProviderType } from "@/types/provider";
import { invoke } from "@tauri-apps/api/core";

const exportVersion = 2;
const appName = "API Manager";
const encryptionIterations = 210_000;

interface PlainApiExportFile {
  app: typeof appName;
  version: number;
  exportedAt: string;
  encrypted: false;
  includesApiKeys: boolean;
  apiConfigs: ApiConfigDraft[];
}

interface EncryptedApiExportFile {
  app: typeof appName;
  version: number;
  exportedAt: string;
  encrypted: true;
  includesApiKeys: true;
  kdf: "PBKDF2";
  cipher: "AES-GCM";
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

type ApiExportFile = PlainApiExportFile | EncryptedApiExportFile;

export interface ParsedApiImport {
  apiConfigs: ApiConfigDraft[];
  includesApiKeys: boolean;
  encrypted: boolean;
}

function isProviderType(value: unknown): value is ProviderType {
  return value === "openai-compatible" || value === "anthropic";
}

function isWebsiteLinkType(value: unknown): value is WebsiteLinkType {
  return (
    value === "console" ||
    value === "billing" ||
    value === "models" ||
    value === "docs" ||
    value === "usage" ||
    value === "custom"
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  return copy.buffer;
}

async function deriveEncryptionKey(
  password: string,
  salt: Uint8Array,
  iterations = encryptionIterations,
) {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: bytesToArrayBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

function stripApiKeys(config: ApiConfigDraft): ApiConfigDraft {
  return {
    ...config,
    openAIConfig: {
      ...config.openAIConfig,
      apiKey: "",
    },
    anthropicConfig: {
      ...config.anthropicConfig,
      apiKey: "",
    },
  };
}

function normalizeWebsiteLinks(value: unknown): ApiWebsiteLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): ApiWebsiteLink | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<ApiWebsiteLink>;
      const link = createWebsiteLink(
        isWebsiteLinkType(record.type) ? record.type : "custom",
      );

      link.id = typeof record.id === "string" && record.id ? record.id : link.id;
      link.label = typeof record.label === "string" ? record.label : "";
      link.url = typeof record.url === "string" ? record.url : "";

      return link.url.trim() ? link : null;
    })
    .filter((item): item is ApiWebsiteLink => Boolean(item));
}

function normalizeProviderConfig(value: unknown): ProviderConnectionConfig {
  const fallback = createEmptyApiDraft().openAIConfig;
  const record =
    value && typeof value === "object"
      ? (value as Partial<ProviderConnectionConfig>)
      : {};

  return {
    ...fallback,
    baseUrl: typeof record.baseUrl === "string" ? record.baseUrl : "",
    apiKey: typeof record.apiKey === "string" ? record.apiKey : "",
    defaultModel:
      typeof record.defaultModel === "string" ? record.defaultModel : "",
    modelListUrl:
      typeof record.modelListUrl === "string" ? record.modelListUrl : "",
    favoriteModels: Array.isArray(record.favoriteModels)
      ? record.favoriteModels
          .filter((model): model is string => typeof model === "string")
          .map((model) => model.trim())
          .filter(Boolean)
      : [],
    parameters: {
      ...fallback.parameters,
      ...(record.parameters && typeof record.parameters === "object"
        ? record.parameters
        : {}),
    },
  };
}

function normalizeImportedConfig(value: unknown): ApiConfigDraft | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<ApiConfig>;

  if (typeof record.name !== "string" || !record.name.trim()) {
    return null;
  }

  const draft = createEmptyApiDraft();

  return {
    ...draft,
    name: record.name,
    providerType: isProviderType(record.providerType)
      ? record.providerType
      : "openai-compatible",
    note: typeof record.note === "string" ? record.note : "",
    aiDescription:
      typeof record.aiDescription === "string" ? record.aiDescription : "",
    websiteUrl: typeof record.websiteUrl === "string" ? record.websiteUrl : "",
    websiteLinks: normalizeWebsiteLinks(record.websiteLinks),
    lastBenchmark:
      record.lastBenchmark && typeof record.lastBenchmark === "object"
        ? record.lastBenchmark
        : undefined,
    openAIConfig: normalizeProviderConfig(record.openAIConfig),
    anthropicConfig: normalizeProviderConfig(record.anthropicConfig),
  };
}

function buildPlainPayload(
  apiConfigs: ApiConfig[],
  includesApiKeys: boolean,
): PlainApiExportFile {
  const drafts = apiConfigs.map((config) => {
    const draft = cloneApiDraft(config);
    return includesApiKeys ? draft : stripApiKeys(draft);
  });

  return {
    app: appName,
    version: exportVersion,
    exportedAt: new Date().toISOString(),
    encrypted: false,
    includesApiKeys,
    apiConfigs: drafts,
  };
}

export function buildSafeExportText(apiConfigs: ApiConfig[]) {
  return JSON.stringify(buildPlainPayload(apiConfigs, false), null, 2);
}

export async function buildEncryptedExportText(
  apiConfigs: ApiConfig[],
  password: string,
) {
  if (!password.trim()) {
    throw new Error("Encrypted export requires a password.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt);
  const plainText = JSON.stringify(buildPlainPayload(apiConfigs, true));
  const encryptedBytes = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: bytesToArrayBuffer(iv),
      },
      key,
      bytesToArrayBuffer(new TextEncoder().encode(plainText)),
    ),
  );
  const payload: EncryptedApiExportFile = {
    app: appName,
    version: exportVersion,
    exportedAt: new Date().toISOString(),
    encrypted: true,
    includesApiKeys: true,
    kdf: "PBKDF2",
    cipher: "AES-GCM",
    iterations: encryptionIterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    data: bytesToBase64(encryptedBytes),
  };

  return JSON.stringify(payload, null, 2);
}

export async function saveJsonFileToDesktop(fileName: string, text: string) {
  return invoke<string>("save_text_file_to_desktop", {
    fileName,
    contents: text,
  });
}

async function decryptPayload(file: EncryptedApiExportFile, password: string) {
  if (!password.trim()) {
    throw new Error("This config file is encrypted and requires a password.");
  }

  const salt = base64ToBytes(file.salt);
  const iv = base64ToBytes(file.iv);
  const encryptedBytes = base64ToBytes(file.data);
  const key = await deriveEncryptionKey(
    password,
    salt,
    file.iterations || encryptionIterations,
  );

  try {
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: bytesToArrayBuffer(iv),
      },
      key,
      bytesToArrayBuffer(encryptedBytes),
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Decrypt failed. Please check the import password.");
  }
}

function parsePlainPayload(file: PlainApiExportFile): ParsedApiImport {
  const apiConfigs = Array.isArray(file.apiConfigs)
    ? file.apiConfigs
        .map((item) => normalizeImportedConfig(item))
        .filter((item): item is ApiConfigDraft => Boolean(item))
    : [];

  if (apiConfigs.length === 0) {
    throw new Error("No usable API configs found in the import file.");
  }

  return {
    apiConfigs,
    includesApiKeys: Boolean(file.includesApiKeys),
    encrypted: Boolean(file.encrypted),
  };
}

export async function parseApiImportText(
  text: string,
  password?: string,
): Promise<ParsedApiImport> {
  let file: ApiExportFile;

  try {
    file = JSON.parse(text) as ApiExportFile;
  } catch {
    throw new Error("The import file is not valid JSON.");
  }

  if (file.app !== appName) {
    throw new Error("The import file is not an API Manager config file.");
  }

  if (file.encrypted) {
    const decryptedText = await decryptPayload(file, password ?? "");
    return parseApiImportText(decryptedText);
  }

  return parsePlainPayload(file);
}

export function createExportFileName(kind: "safe" | "encrypted") {
  const date = new Date().toISOString().slice(0, 10);
  return `api-manager-${kind}-export-${date}.json`;
}
