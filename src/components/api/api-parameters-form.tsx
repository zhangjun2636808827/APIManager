import type { ChatModelParameters } from "@/types/api-config";

interface ApiParametersFormProps {
  value: ChatModelParameters;
  maxTokensError?: string;
  onChange: (nextValue: ChatModelParameters) => void;
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function ApiParametersForm({
  value,
  maxTokensError,
  onChange,
}: ApiParametersFormProps) {
  function updateField<K extends keyof ChatModelParameters>(
    key: K,
    fieldValue: ChatModelParameters[K],
  ) {
    onChange({
      ...value,
      [key]: fieldValue,
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-slate-900">模型参数</h4>
        <p className="text-xs leading-5 text-slate-500">
          这些参数会作为当前协议的默认聊天设置，后续聊天请求会优先读取这里的配置。
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">
            Temperature
          </span>
          <input
            type="number"
            min={0}
            max={2}
            step={0.1}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={value.temperature}
            onChange={(event) =>
              updateField(
                "temperature",
                clampNumber(Number(event.target.value), 0, 2),
              )
            }
          />
          <span className="text-xs text-slate-500">越高越发散，越低越稳定。</span>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">Top P</span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={value.topP}
            onChange={(event) =>
              updateField("topP", clampNumber(Number(event.target.value), 0, 1))
            }
          />
          <span className="text-xs text-slate-500">控制候选词采样范围。</span>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">Max Tokens</span>
          <input
            type="number"
            min={1}
            step={1}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={value.maxTokens}
            onChange={(event) =>
              updateField("maxTokens", Math.max(1, Number(event.target.value)))
            }
          />
          {maxTokensError ? (
            <span className="text-xs text-red-600">{maxTokensError}</span>
          ) : (
            <span className="text-xs text-slate-500">限制单次回复最大长度。</span>
          )}
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">
            输出模式
          </span>
          <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={value.stream}
              onChange={(event) => updateField("stream", event.target.checked)}
            />
            默认使用流式输出
          </label>
          <span className="text-xs text-slate-500">关闭后可用于后续非流式测试。</span>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">
            Presence Penalty
          </span>
          <input
            type="number"
            min={-2}
            max={2}
            step={0.1}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={value.presencePenalty}
            onChange={(event) =>
              updateField(
                "presencePenalty",
                clampNumber(Number(event.target.value), -2, 2),
              )
            }
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-800">
            Frequency Penalty
          </span>
          <input
            type="number"
            min={-2}
            max={2}
            step={0.1}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            value={value.frequencyPenalty}
            onChange={(event) =>
              updateField(
                "frequencyPenalty",
                clampNumber(Number(event.target.value), -2, 2),
              )
            }
          />
        </label>
      </div>

      <label className="mt-4 grid gap-2">
        <span className="text-sm font-medium text-slate-800">System Prompt</span>
        <textarea
          className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          value={value.systemPrompt}
          onChange={(event) => updateField("systemPrompt", event.target.value)}
          placeholder="You are a helpful assistant."
        />
      </label>
    </section>
  );
}
