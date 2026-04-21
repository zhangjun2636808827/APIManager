export type StreamTextHandler = (text: string) => void;
export type StreamJsonHandler = (data: unknown) => void;

function parseSseEvents(buffer: string) {
  const events = buffer.split(/\r?\n\r?\n/);
  const rest = events.pop() ?? "";

  return {
    events,
    rest,
  };
}

function emitSseEvent(rawEvent: string, onJson: StreamJsonHandler) {
  const dataLines = rawEvent
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());

  if (dataLines.length === 0) {
    return;
  }

  const dataText = dataLines.join("\n");

  if (!dataText || dataText === "[DONE]") {
    return;
  }

  try {
    onJson(JSON.parse(dataText));
  } catch {
    // Some providers may emit non-JSON keepalive data. Ignore those safely.
  }
}

export async function readSseStream(
  response: Response,
  onJson: StreamJsonHandler,
) {
  if (!response.body) {
    const text = await response.text();
    const { events, rest } = parseSseEvents(text);
    events.forEach((event) => emitSseEvent(event, onJson));

    if (rest.trim()) {
      emitSseEvent(rest, onJson);
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseEvents(buffer);
    buffer = parsed.rest;
    parsed.events.forEach((event) => emitSseEvent(event, onJson));
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    emitSseEvent(buffer, onJson);
  }
}
