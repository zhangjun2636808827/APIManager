import { formatUnknownError } from "@/lib/errors";
import { getProviderAdapter } from "@/modules/provider/provider-registry";
import type { ConnectionTestResult } from "@/modules/provider/provider.types";
import {
  getActiveProviderConfig,
  type ApiConfig,
} from "@/types/api-config";
import type { ChatMessage } from "@/types/chat";

function buildBenchmarkPrompt(config: ApiConfig) {
  const activeProviderConfig = getActiveProviderConfig(config);

  return [
    "请用中文生成一份简洁的模型档案，用于 API 管理工具展示。",
    "请尽量基于你对自身模型的了解回答；如果某项未知或未公开，请明确写“未知”或“未公开”，不要编造。",
    "",
    `当前请求模型 ID：${activeProviderConfig.defaultModel}`,
    `当前 Provider 类型：${config.providerType}`,
    "",
    "请按以下格式输出：",
    "模型名称：",
    "所属企业/机构：",
    "参数规模：",
    "支持能力：文字 / 图像 / 语音 / 视频 / 文档 / 代码 / 工具调用 / 其他",
    "适合场景：",
    "主要限制：",
    "一句话总结：",
    "",
    "请控制在 220 字以内。",
  ].join("\n");
}

function createBenchmarkMessage(config: ApiConfig): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content: buildBenchmarkPrompt(config),
    createdAt: new Date().toISOString(),
  };
}

function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

function isOverloadedError(error: unknown) {
  const message = formatUnknownError(error);
  return /overloaded|529/i.test(message);
}

function buildBenchmarkMessage(
  basicMessage: string,
  totalMs: number,
  outputChars: number,
  charsPerSecond: number,
) {
  return [
    basicMessage,
    `回复耗时：${Math.round(totalMs)} ms`,
    `输出长度：${outputChars} 字符`,
    `输出速度：${roundMetric(charsPerSecond)} 字符/秒`,
  ].join("\n");
}

function buildBenchmarkSkippedResult(
  config: ApiConfig,
  basicResult: ConnectionTestResult,
  basicStartTime: number,
  error: unknown,
): ConnectionTestResult {
  const message = formatUnknownError(error);
  const overloaded = isOverloadedError(error);

  return {
    ...basicResult,
    ok: true,
    message: overloaded
      ? `${basicResult.message}\n连接可用，但模型档案测试阶段遇到 provider 过载，稍后可重新测试。`
      : `${basicResult.message}\n连接可用，但模型档案测试请求失败：${message}`,
    latencyMs: Math.round(performance.now() - basicStartTime),
    totalMs: 0,
    outputChars: 0,
    charsPerSecond: 0,
    prompt: buildBenchmarkPrompt(config),
    responsePreview: "",
    qualitySummary: overloaded
      ? "连接测试通过；模型档案测试阶段返回 529 overloaded。"
      : "连接测试通过；模型档案测试失败，不影响该 API 的基础可用性。",
  };
}

export async function testProviderConnection(
  config: ApiConfig,
): Promise<ConnectionTestResult> {
  const adapter = getProviderAdapter(config.providerType);
  const basicStartTime = performance.now();

  let basicResult: ConnectionTestResult;

  try {
    basicResult = await adapter.testConnection({
      config,
      messages: [],
    });
  } catch (error) {
    if (isOverloadedError(error)) {
      return {
        ok: false,
        message:
          "服务当前过载，测试请求被 provider 拒绝。你的配置不一定有问题；如果聊天可用，可以稍后再测试连接。",
        latencyMs: Math.round(performance.now() - basicStartTime),
        totalMs: 0,
        outputChars: 0,
        charsPerSecond: 0,
        prompt: buildBenchmarkPrompt(config),
        responsePreview: "",
        qualitySummary: "Provider 返回 529 overloaded，建议稍后重试。",
      };
    }

    throw error;
  }

  const benchmarkStartTime = performance.now();

  try {
    const benchmarkResponse = await adapter.sendMessage({
      config,
      messages: [createBenchmarkMessage(config)],
    });
    const benchmarkEndTime = performance.now();
    const latencyMs = benchmarkStartTime - basicStartTime;
    const totalMs = benchmarkEndTime - benchmarkStartTime;
    const outputChars = benchmarkResponse.content.length;
    const charsPerSecond =
      totalMs > 0 ? outputChars / (totalMs / 1000) : outputChars;

    return {
      ...basicResult,
      message: buildBenchmarkMessage(
        basicResult.message,
        totalMs,
        outputChars,
        charsPerSecond,
      ),
      latencyMs: Math.round(latencyMs),
      totalMs: Math.round(totalMs),
      outputChars,
      charsPerSecond: roundMetric(charsPerSecond),
      prompt: buildBenchmarkPrompt(config),
      responsePreview: benchmarkResponse.content.slice(0, 300),
      selfIntroduction: benchmarkResponse.content,
      qualitySummary:
        "模型已按固定提示返回模型档案，可结合耗时、能力描述和限制判断是否适合当前用途。",
    };
  } catch (error) {
    return buildBenchmarkSkippedResult(config, basicResult, basicStartTime, error);
  }
}
