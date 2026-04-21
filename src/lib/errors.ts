export function formatUnknownError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;

    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }

    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "发生了未知错误。";
    }
  }

  return "发生了未知错误。";
}

export function buildNetworkErrorMessage(
  providerLabel: string,
  requestUrl: string,
  error: unknown,
) {
  const errorMessage = formatUnknownError(error);

  return `${providerLabel} 请求失败，无法连接到 ${requestUrl}。${errorMessage}`;
}
