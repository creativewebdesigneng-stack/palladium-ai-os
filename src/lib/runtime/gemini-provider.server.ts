import {
  ProviderError,
  type ChatMessage,
  type ChatResult,
  type RunArgs,
  type StreamEvent,
  type ToolCall,
} from "./model-gateway.base";

const RETRY_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function parseToolResult(content: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { result: parsed };
  } catch {
    return { result: content };
  }
}

function toolNameFor(messages: ChatMessage[], index: number, message: ChatMessage): string {
  if (message.name) return message.name;
  if (message.tool_call_id) {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const call = messages[cursor]?.tool_calls?.find((candidate) => candidate.id === message.tool_call_id);
      if (call?.name) return call.name;
    }
  }
  return "tool_result";
}

function geminiBody(args: RunArgs) {
  const systemText = args.messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .filter(Boolean)
    .join("\n\n");

  const contents = args.messages.flatMap((message, index) => {
    if (message.role === "system") return [];
    if (message.role === "tool") {
      return [
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: toolNameFor(args.messages, index, message),
                response: parseToolResult(message.content),
              },
            },
          ],
        },
      ];
    }
    if (message.role === "assistant") {
      const parts: Array<Record<string, unknown>> = [];
      if (message.content) parts.push({ text: message.content });
      for (const call of message.tool_calls ?? []) {
        parts.push({ functionCall: { name: call.name, args: call.arguments } });
      }
      return parts.length ? [{ role: "model", parts }] : [];
    }
    return [{ role: "user", parts: [{ text: message.content }] }];
  });

  return {
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    contents,
    ...(args.tools?.length
      ? {
          tools: [
            {
              functionDeclarations: args.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              })),
            },
          ],
        }
      : {}),
    ...(args.temperature != null || args.maxTokens
      ? {
          generationConfig: {
            ...(args.temperature != null ? { temperature: args.temperature } : {}),
            ...(args.maxTokens ? { maxOutputTokens: args.maxTokens } : {}),
          },
        }
      : {}),
  };
}

function geminiError(status: number, body: string): ProviderError {
  let providerStatus = "";
  let message = "";
  try {
    const parsed = JSON.parse(body) as { error?: { status?: unknown; message?: unknown } };
    providerStatus = typeof parsed.error?.status === "string" ? parsed.error.status.toLowerCase() : "";
    message = typeof parsed.error?.message === "string" ? parsed.error.message.toLowerCase() : "";
  } catch {}

  if (
    status === 429 &&
    (providerStatus === "resource_exhausted" || message.includes("quota") || message.includes("credit"))
  ) {
    return new ProviderError("Google Gemini quota is currently exhausted for this workspace.", 429, true);
  }
  if (status === 401 || status === 403) {
    return new ProviderError("Google Gemini rejected the runtime credentials.", status, false);
  }
  if (status === 404) {
    return new ProviderError("The selected Google Gemini model is not available to this workspace.", 404, false);
  }
  return new ProviderError(
    `Google Gemini provider error (${status}).`,
    status,
    RETRY_STATUS.has(status),
  );
}

async function requestGemini(args: RunArgs): Promise<Response> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new ProviderError("Google Gemini is not configured for this workspace.", 503, false);

  const timeout = args.timeoutMs ?? 90_000;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const timer = AbortSignal.timeout(timeout);
    const signal = args.signal ? anySignal([args.signal, timer]) : timer;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody(args)),
        signal,
      });
      if (response.ok) return response;
      const body = await response.text();
      const error = geminiError(response.status, body);
      if (!error.retryable || attempt === 2) throw error;
      lastError = error;
    } catch (error) {
      if (args.signal?.aborted) throw new ProviderError("Run cancelled.", 499, false);
      if (error instanceof ProviderError && !error.retryable) throw error;
      if (attempt === 2) {
        throw error instanceof ProviderError
          ? error
          : new ProviderError("Google Gemini did not respond in time.", 504, true);
      }
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
  }

  throw lastError instanceof Error
    ? lastError
    : new ProviderError("Google Gemini request failed.", 500, false);
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

export async function runGeminiNative(args: RunArgs): Promise<ChatResult> {
  const response = await requestGemini(args);
  const json = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: unknown; functionCall?: { name?: unknown; args?: unknown } }> };
    }>;
    usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown };
  };

  const parts = json.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("")
    .trim();
  const toolCalls: ToolCall[] = parts.flatMap((part, index) => {
    const call = part.functionCall;
    if (!call || typeof call.name !== "string" || !call.name) return [];
    const argumentsValue = call.args && typeof call.args === "object" && !Array.isArray(call.args)
      ? (call.args as Record<string, unknown>)
      : {};
    return [{ id: `gemini_call_${index}_${call.name}`, name: call.name, arguments: argumentsValue }];
  });
  const input = typeof json.usageMetadata?.promptTokenCount === "number" ? json.usageMetadata.promptTokenCount : 0;
  const output = typeof json.usageMetadata?.candidatesTokenCount === "number" ? json.usageMetadata.candidatesTokenCount : 0;

  return {
    text,
    toolCalls,
    usage: { input, output },
    provider: "gemini",
    model: args.model,
  };
}

export async function* streamGeminiNative(args: RunArgs): AsyncGenerator<StreamEvent> {
  // Keep one native transport contract for reliability. Streaming callers still
  // receive the standard runtime event shape; token-level streaming can be added
  // later without changing agent execution semantics.
  const result = await runGeminiNative(args);
  if (result.text) yield { type: "text", delta: result.text };
  if (result.toolCalls.length) yield { type: "tool_calls", toolCalls: result.toolCalls };
  yield { type: "done", result };
}
