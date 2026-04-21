import { MessageSquareMore, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatSession } from "@/types/chat";

interface ChatSessionListProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string) => void;
  onRemoveSession: (sessionId: string) => void;
}

export function ChatSessionList({
  sessions,
  activeSessionId,
  onCreateSession,
  onSelectSession,
  onRenameSession,
  onRemoveSession,
}: ChatSessionListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">会话列表</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            当前 API 的会话会单独保留，方便你按 API 维度切换上下文。
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onCreateSession}>
          <Plus className="h-4 w-4" />
          新建会话
        </Button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const preview =
            session.messages[session.messages.length - 1]?.content ??
            "还没有消息，发送第一条内容开始对话。";

          return (
            <div
              key={session.id}
              className={cn(
                "rounded-xl border p-4 transition-colors",
                isActive
                  ? "border-slate-900 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectSession(session.id)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      isActive ? "bg-slate-800 text-slate-100" : "bg-slate-100 text-slate-700",
                    )}
                  >
                    <MessageSquareMore className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">{session.title}</p>
                      <span
                        className={cn(
                          "shrink-0 text-[11px]",
                          isActive ? "text-slate-300" : "text-slate-500",
                        )}
                      >
                        {new Date(session.updatedAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-2 line-clamp-2 text-xs leading-5",
                        isActive ? "text-slate-300" : "text-slate-600",
                      )}
                    >
                      {preview}
                    </p>
                  </div>
                </div>
              </button>

              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isActive ? "secondary" : "ghost"}
                  onClick={() => onRenameSession(session.id)}
                >
                  <Pencil className="h-4 w-4" />
                  重命名
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={isActive ? "secondary" : "ghost"}
                  onClick={() => onRemoveSession(session.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
