import type { ChatSession } from "@/types/chat";

const chatStorageKey = "api-manager.chat-state";

export interface ChatStorageState {
  sessionsByApi: Record<string, ChatSession[]>;
  activeSessionIds: Record<string, string | null>;
}

const emptyChatStorageState: ChatStorageState = {
  sessionsByApi: {},
  activeSessionIds: {},
};

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<ChatSession>;

  return (
    typeof session.id === "string" &&
    typeof session.apiId === "string" &&
    typeof session.title === "string" &&
    typeof session.createdAt === "string" &&
    typeof session.updatedAt === "string" &&
    Array.isArray(session.messages)
  );
}

function normalizeSessionsByApi(value: unknown): Record<string, ChatSession[]> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, ChatSession[]>
  >((result, [apiId, sessions]) => {
    if (!Array.isArray(sessions)) {
      return result;
    }

    const validSessions = sessions.filter(isChatSession);

    if (validSessions.length > 0) {
      result[apiId] = validSessions;
    }

    return result;
  }, {});
}

function normalizeActiveSessionIds(value: unknown): Record<string, string | null> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, string | null>
  >((result, [apiId, sessionId]) => {
    result[apiId] = typeof sessionId === "string" ? sessionId : null;
    return result;
  }, {});
}

export function loadChatStorageState(): ChatStorageState {
  if (typeof window === "undefined") {
    return emptyChatStorageState;
  }

  try {
    const rawState = window.localStorage.getItem(chatStorageKey);

    if (!rawState) {
      return emptyChatStorageState;
    }

    const parsedState = JSON.parse(rawState) as Partial<ChatStorageState>;

    return {
      sessionsByApi: normalizeSessionsByApi(parsedState.sessionsByApi),
      activeSessionIds: normalizeActiveSessionIds(parsedState.activeSessionIds),
    };
  } catch {
    return emptyChatStorageState;
  }
}

export function persistChatStorageState(state: ChatStorageState) {
  if (typeof window === "undefined") {
    return;
  }

  const nextValue = JSON.stringify(state);
  const currentValue = window.localStorage.getItem(chatStorageKey);

  if (currentValue === nextValue) {
    return;
  }

  window.localStorage.setItem(chatStorageKey, nextValue);
}
