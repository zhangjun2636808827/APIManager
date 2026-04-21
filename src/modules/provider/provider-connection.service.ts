import { getProviderAdapter } from "@/modules/provider/provider-registry";
import type { ConnectionTestResult } from "@/modules/provider/provider.types";
import { getActiveProviderConfig, type ApiConfig } from "@/types/api-config";
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

function buildResultMessage(
  totalMs: number,
  outputChars: number,
  charsPerSecond: number,
  firstTokenMs?: number,
) {
  return [
    "测试成功：聊天接口已响应，并返回模型档案。",
    firstTokenMs ? `首段返回：${Math.round(firstTokenMs)} ms` : null,
    `回复耗时：${Math.round(totalMs)} ms`,
    `输出长度：${outputChars} 字符`,
    `输出速度：${roundMetric(charsPerSecond)} 字符/秒`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function testProviderConnection(
  config: ApiConfig,
): Promise<ConnectionTestResult> {
  const adapter = getProviderAdapter(config.providerType);
  const activeProviderConfig = getActiveProviderConfig(config);
  const prompt = buildBenchmarkPrompt(config);
  const benchmarkMessage = createBenchmarkMessage(config);
  const startTime = performance.now();
  let firstTokenMs: number | undefined;
  let content = "";

  const requestInput = {
    config,
    selectedModel: activeProviderConfig.defaultModel,
    messages: [benchmarkMessage],
  };

  if (activeProviderConfig.parameters.stream) {
    const response = await adapter.streamMessage(requestInput, {
      onText: (text) => {
        if (firstTokenMs === undefined && text.trim()) {
          firstTokenMs = performance.now() - startTime;
        }

        content += text;
      },
    });

    content = content.trim() || response.content;
  } else {
    const response = await adapter.sendMessage(requestInput);

    content = response.content;
  }

  const endTime = performance.now();
  const totalMs = Math.max(endTime - startTime, 1);
  const outputChars = content.length;
  const charsPerSecond = outputChars / (totalMs / 1000);

  return {
    ok: true,
    message: buildResultMessage(
      totalMs,
      outputChars,
      charsPerSecond,
      firstTokenMs,
    ),
    latencyMs: firstTokenMs ? Math.round(firstTokenMs) : Math.round(totalMs),
    totalMs: Math.round(totalMs),
    firstTokenMs: firstTokenMs ? Math.round(firstTokenMs) : undefined,
    outputChars,
    charsPerSecond: roundMetric(charsPerSecond),
    prompt,
    responsePreview: content.slice(0, 300),
    selfIntroduction: content,
    qualitySummary:
      "模型已按固定提示返回模型档案。可结合耗时、输出速度、能力描述和限制判断是否适合当前用途。",
  };
}
