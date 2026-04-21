import { FormEvent } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

interface MessageInputProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function MessageInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: MessageInputProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <textarea
        className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        placeholder="输入一条消息，先走本地骨架流程。下一步我们再接真实 provider 请求。"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          `Enter` 暂不直接发送，避免误触；当前先通过按钮触发。
        </p>
        <Button type="submit" disabled={disabled}>
          <SendHorizontal className="h-4 w-4" />
          发送消息
        </Button>
      </div>
    </form>
  );
}
