import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Eraser, LoaderCircle, MessageSquareText, Plus, Settings2, Square } from "lucide-react";

import { CurrentApiSummary } from "@/components/api/current-api-summary";
import { ChatSessionList } from "@/components/chat/chat-session-list";
import { MessageBubble } from "@/components/chat/message-bubble";
import { MessageInput } from "@/components/chat/message-input";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { formatUnknownError } from "@/lib/errors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApiContext } from "@/modules/api/api-context";
import {
  loadChatStorageState,
  persistChatStorageState,
} from "@/modules/chat/chat-storage";
import { sendChatMessage, streamChatMessage } from "@/modules/chat/chat.service";
import { getActiveProviderConfig } from "@/types/api-config";
import type { ChatMessage, ChatSession } from "@/types/chat";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function createChatSession(apiId: string, title = "新会话"): ChatSession {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    apiId,
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function getSessionTitle(messages: ChatMessage[], fallbackTitle: string) {
  const firstUserMessage = messages.find((message) => message.role === "user");

  if (!firstUserMessage) {
    return fallbackTitle;
  }

  return firstUserMessage.content.slice(0, 24) || fallbackTitle;
}

export function ChatPage() {
  const { selectedApi } = useApiContext();
  const initialChatState = useMemo(() => loadChatStorageState(), []);
  const [draft, setDraft] = useState("");
  const [sessionsByApi, setSessionsByApi] = useState(
    initialChatState.sessionsByApi,
  );
  const [activeSessionIds, setActiveSessionIds] = useState(
    initialChatState.activeSessionIds,
  );
  const [isSending, setIsSending] = useState(false);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedApiId = selectedApi?.id ?? null;
  const activeProviderConfig = selectedApi
    ? getActiveProviderConfig(selectedApi)
    : null;
  const sessions = selectedApiId ? (sessionsByApi[selectedApiId] ?? []) : [];
  const activeSessionId = selectedApiId
    ? (activeSessionIds[selectedApiId] ?? null)
    : null;
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? null;
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    persistChatStorageState({
      sessionsByApi,
      activeSessionIds,
    });
  }, [activeSessionIds, sessionsByApi]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    setDraft("");
  }, [selectedApiId]);

  useEffect(() => {
    if (!selectedApiId || sessions.length > 0) {
      return;
    }

    const nextSession = createChatSession(selectedApiId);

    setSessionsByApi((current) => ({
      ...current,
      [selectedApiId]: [nextSession],
    }));
    setActiveSessionIds((current) => ({
      ...current,
      [selectedApiId]: nextSession.id,
    }));
  }, [selectedApiId, sessions.length]);

  useEffect(() => {
    if (!selectedApiId || !sessions.length) {
      return;
    }

    if (!activeSessionId || !sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionIds((current) => ({
        ...current,
        [selectedApiId]: sessions[0]?.id ?? null,
      }));
    }
  }, [activeSessionId, selectedApiId, sessions]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [activeSessionId, messages.length, isSending]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  function handleCreateSession() {
    if (!selectedApiId) {
      return;
    }

    const nextSession = createChatSession(selectedApiId, `新会话 ${sessions.length + 1}`);

    setSessionsByApi((current) => ({
      ...current,
      [selectedApiId]: [nextSession, ...(current[selectedApiId] ?? [])],
    }));
    setActiveSessionIds((current) => ({
      ...current,
      [selectedApiId]: nextSession.id,
    }));
    setDraft("");
  }

  function handleSelectSession(sessionId: string) {
    if (!selectedApiId) {
      return;
    }

    setActiveSessionIds((current) => ({
      ...current,
      [selectedApiId]: sessionId,
    }));
    setDraft("");
  }

  function handleRenameSession(sessionId: string) {
    if (!selectedApiId) {
      return;
    }

    const targetSession = sessions.find((session) => session.id === sessionId);

    if (!targetSession) {
      return;
    }

    const nextTitle = window.prompt("请输入新的会话名称", targetSession.title)?.trim();

    if (!nextTitle) {
      return;
    }

    setSessionsByApi((current) => ({
      ...current,
      [selectedApiId]: (current[selectedApiId] ?? []).map((session) =>
        session.id === sessionId
          ? {
              ...session,
              title: nextTitle,
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    }));
  }

  function handleRemoveSession(sessionId: string) {
    if (!selectedApiId) {
      return;
    }

    const targetSession = sessions.find((session) => session.id === sessionId);

    if (!targetSession) {
      return;
    }

    const confirmed = window.confirm(
      `确定要删除会话“${targetSession.title}”吗？该会话中的消息也会一起移除。`,
    );

    if (!confirmed) {
      return;
    }

    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    const fallbackSession = nextSessions[0] ?? createChatSession(selectedApiId);
    const normalizedSessions = nextSessions.length > 0 ? nextSessions : [fallbackSession];

    setSessionsByApi((current) => ({
      ...current,
      [selectedApiId]: normalizedSessions,
    }));
    setActiveSessionIds((current) => ({
      ...current,
      [selectedApiId]:
        activeSessionId === sessionId ? fallbackSession.id : activeSessionId,
    }));
    setDraft("");
  }

  function handleClearActiveSession() {
    if (!selectedApiId || !activeSession) {
      return;
    }

    if (activeSession.messages.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `确定要清空会话“${activeSession.title}”中的全部消息吗？`,
    );

    if (!confirmed) {
      return;
    }

    setSessionsByApi((current) => ({
      ...current,
      [selectedApiId]: (current[selectedApiId] ?? []).map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              messages: [],
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    }));
    setDraft("");
  }

  function handleStopStreaming() {
    abortControllerRef.current?.abort();
  }

  function updateAssistantMessageContent(
    sessionId: string,
    messageId: string,
    getNextContent: (currentContent: string) => string,
  ) {
    if (!selectedApiId) {
      return;
    }

    setSessionsByApi((current) => ({
      ...current,
      [selectedApiId]: (current[selectedApiId] ?? []).map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        const updatedMessages = session.messages.map((message) =>
          message.id === messageId
            ? {
                ...message,
                content: getNextContent(message.content),
              }
            : message,
        );

        return {
          ...session,
          messages: updatedMessages,
          title: getSessionTitle(updatedMessages, session.title),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }

  async function handleSubmitMessage() {
    const nextContent = draft.trim();

    if (!nextContent || isSending || !activeSession || !selectedApi || !selectedApiId) {
      return;
    }

    const userMessage = createMessage("user", nextContent);
    const assistantMessage = createMessage("assistant", "");
    const nextMessages = [...activeSession.messages, userMessage, assistantMessage];

    setSessionsByApi((current) => ({
      ...current,
      [selectedApiId]: (current[selectedApiId] ?? []).map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              messages: nextMessages,
              title: getSessionTitle(nextMessages, session.title),
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    }));
    setDraft("");
    const abortController = new AbortController();

    try {
      abortControllerRef.current = abortController;
      setIsSending(true);

      const requestInput = {
        config: selectedApi,
        messages: [...activeSession.messages, userMessage],
        signal: abortController.signal,
      };

      if (activeProviderConfig?.parameters.stream) {
        await streamChatMessage(requestInput, {
          onText: (text) => {
            updateAssistantMessageContent(
              activeSession.id,
              assistantMessage.id,
              (currentContent) => `${currentContent}${text}`,
            );
          },
        });
      } else {
        const response = await sendChatMessage(requestInput);
        updateAssistantMessageContent(
          activeSession.id,
          assistantMessage.id,
          () => response.content,
        );
      }
    } catch (error) {
      if (abortController.signal.aborted) {
        updateAssistantMessageContent(
          activeSession.id,
          assistantMessage.id,
          (currentContent) =>
            currentContent.trim()
              ? `${currentContent}\n\n已停止生成。`
              : "已停止生成。",
        );
        return;
      }

      const errorMessage = formatUnknownError(error);

      updateAssistantMessageContent(
        activeSession.id,
        assistantMessage.id,
        (currentContent) =>
          currentContent.trim()
            ? `${currentContent}\n\n请求失败：${errorMessage}`
            : `请求失败：${errorMessage}`,
      );
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsSending(false);
    }
  }

  if (!selectedApi) {
    return (
      <section className="w-full">
        <PageHeader
          title="聊天页"
          description="聊天页绑定当前选中的 API。开始前，请先创建或选择一个配置。"
        />

        <Card className="min-h-[420px]">
          <CardContent className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-950">
              还没有可用的当前 API
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
              聊天页只读取全局当前 API。请先到 API 管理页创建或选择配置。
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/api-management">
                <Button>
                  <Settings2 className="h-4 w-4" />
                  去 API 管理页
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col">
      <PageHeader
        title="聊天页"
        description="统一聊天入口，支持会话管理、流式回复、自动滚动和停止生成。"
      />

      <div className="grid min-h-[calc(100vh-10rem)] gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>当前 API</CardTitle>
            <CardDescription>
              直接读取全局当前 API，保证请求目标一致。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CurrentApiSummary apiConfig={selectedApi} />

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <Link
                to="/api-management"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                <Settings2 className="h-4 w-4" />
                返回 API 管理页调整配置
              </Link>
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                这一步已经补上：
                <br />
                1. 清空当前会话消息
                <br />
                2. 消息自动滚动到底部
                <br />
                3. 继续沿用会话本地持久化
              </div>
            </div>

            <ChatSessionList
              sessions={sessions}
              activeSessionId={activeSessionId}
              onCreateSession={handleCreateSession}
              onSelectSession={handleSelectSession}
              onRenameSession={handleRenameSession}
              onRemoveSession={handleRemoveSession}
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>聊天窗口</CardTitle>
                <CardDescription>
                  当前 API 是 <span className="font-medium text-slate-900">{selectedApi.name}</span>。
                  当前协议会读取对应的独立连接配置。
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isSending ? (
                  <Button type="button" variant="outline" onClick={handleStopStreaming}>
                    <Square className="h-4 w-4" />
                    停止回复
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClearActiveSession}
                  disabled={!activeSession || messages.length === 0}
                >
                  <Eraser className="h-4 w-4" />
                  清空消息
                </Button>
                <Button type="button" variant="outline" onClick={handleCreateSession}>
                  <Plus className="h-4 w-4" />
                  新建会话
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div className="grid gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 md:grid-cols-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">当前会话</p>
                <p className="mt-1 truncate font-medium text-slate-900" title={activeSession?.title ?? "未创建"}>
                  {activeSession?.title ?? "未创建"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">默认模型</p>
                <p className="mt-1 truncate font-medium text-slate-900" title={activeProviderConfig?.defaultModel || "未填写"}>
                  {activeProviderConfig?.defaultModel || "未填写"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">当前协议</p>
                <p className="mt-1 truncate font-medium text-slate-900" title={selectedApi.providerType}>
                  {selectedApi.providerType}
                </p>
              </div>
              <div className="min-w-0 md:col-span-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">参数摘要</p>
                <p className="mt-1 truncate font-medium text-slate-900">
                  Temp {activeProviderConfig?.parameters.temperature ?? "-"} · Top P {activeProviderConfig?.parameters.topP ?? "-"} · Max Tokens {activeProviderConfig?.parameters.maxTokens ?? "-"} · {activeProviderConfig?.parameters.stream ? "流式输出" : "非流式输出"}
                </p>
              </div>
            </div>

            <div className="max-h-[58vh] min-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-5">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {isSending ? (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        正在等待模型回复...
                      </div>
                    </div>
                  ) : null}
                  <div ref={messageEndRef} />
                </div>
              ) : (
                <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">
                    {isSending ? "正在等待模型回复" : "当前会话还没有消息"}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                    {isSending
                      ? "请求已经发送，请稍等模型返回结果。"
                      : "同一个 API 可以创建多个会话，方便按主题拆分上下文。"}
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {isSending
                    ? "正在回复中，请等待当前请求完成后再继续发送。"
                    : "请求会走 Tauri HTTP 插件，避免 WebView 跨域限制。"}
                </div>
              </div>
              <div className="mt-4">
                <MessageInput
                  value={draft}
                  onChange={setDraft}
                  onSubmit={handleSubmitMessage}
                  disabled={!draft.trim() || isSending || !activeSession}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}




