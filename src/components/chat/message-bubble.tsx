import { useState } from "react";
import { Bot, Copy, User2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopyMessage() {
    if (!message.content.trim()) {
      return;
    }

    try {
      await copyTextToClipboard(message.content);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    } catch {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 1600);
    }
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}

      <div
        className={cn(
          "group max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
          isUser
            ? "bg-slate-950 text-white"
            : "border border-slate-200 bg-white text-slate-900",
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content || "正在生成回复..."}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p
            className={cn(
              "text-[11px]",
              isUser ? "text-slate-300" : "text-slate-500",
            )}
          >
            {new Date(message.createdAt).toLocaleTimeString()}
          </p>
          <Button
            type="button"
            size="sm"
            variant={isUser ? "secondary" : "ghost"}
            className={cn(
              "h-7 px-2 text-[11px]",
              isUser ? "bg-white/10 text-white hover:bg-white/20" : "",
            )}
            onClick={handleCopyMessage}
            disabled={!message.content.trim()}
          >
            <Copy className="h-3.5 w-3.5" />
            {copyStatus === "copied"
              ? "已复制"
              : copyStatus === "error"
                ? "失败"
                : "复制"}
          </Button>
        </div>
      </div>

      {isUser ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 shadow-sm">
          <User2 className="h-4 w-4" />
        </div>
      ) : null}
    </div>
  );
}
