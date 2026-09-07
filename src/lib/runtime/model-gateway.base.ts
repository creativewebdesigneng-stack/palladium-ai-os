import { resolveBlackstarAstraServingCacheControl } from "./blackstar-astra-serving-cache";

/**
 * Model gateway — the agent runtime is never hard-coded to one vendor.
 *
 * Supported providers (an agent picks one via `personal_agents.model_provider`):
 *   - `lovable`     Lovable AI Gateway                    -> LOVABLE_API_KEY
 *   - `gemini`      Google Gemini API                     -> GEMINI_API_KEY
 *   - `openai`      OpenAI                                -> OPENAI_API_KEY
 *   - `anthropic`   Anthropic Messages API                -> ANTHROPIC_API_KEY
 *   - `groq`        Groq OpenAI-compatible API            -> GROQ_API_KEY
 *   - `deepseek`    DeepSeek OpenAI-compatible API        -> DEEPSEEK_API_KEY
 *   - `compatible`  Any OpenAI-compatible/local endpoint  -> OPENAI_COMPATIBLE_BASE_URL
 *
 * Keys are read inside the call, server-side only. They are never returned to
 * the caller and never leave this module.
 */

export type Provider = "lovable" | "gemini" | "openai" | "anthropic" | "groq" | "deepseek" | "compatible";

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
};

export type ToolCall = { id: string; name: string; arguments: Record<string, unknown> };

export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ChatResult = {
  text: string;
  toolCalls: ToolCall[];
  usage: { input: number; output: number };
  provider: Provider;
  model: string;
};

export type StreamEvent =
  | { type: "text"; delta: string }
  | { type: "tool_calls"; toolCalls: ToolCall[] }
  | { type: "done"; result: ChatResult };

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

const DEFAULT_MODEL: Record<Provider, string> = {
  lovable: "google/gemini-3-flash-preview",
  gemini: "gemini-3.7-flash",
  openai: "gpt-5-mini",
  anthropic: "claude-sonnet-4-5-20250929",
  groq: "openai/gpt-oss-120b",
  deepseek: "deepseek-chat",
  compatible: "local-model",
};

function blackstarNativePrimaryEnabled(): boolean {
  const value = process.env["BLACKSTAR_NATIVE_PRIMARY"]?.trim().toLowerCase();
  return (value === "1" || value === "true" || value === "yes" || value === "on")
    && Boolean(process.env["OPENAI_COMPATIBLE_BASE_URL"]?.trim());
}

export function normaliseProvider(value?: string | null): Provider {
  const v = (value ?? "").toLowerCase();
  if (v === "gemini" || v === "google" || v === "google-gemini") return "gemini";
  if (v === "openai") return "openai";
  if (v === "anthropic" || v === "claude") return "anthropic";
  if (v === "groq") return "groq";
  if (v === "deepseek" || v === "deepseek-v3" || v === "deepseek-v3.1") return "deepseek";
  if (v === "compatible" || v === "openai-compatible" || v === "local" || v === "ollama")
    return "compatible";
  // No explicit choice: an explicitly activated Blackstar-controlled runtime is
  // the primary route. External providers remain bounded fallback lanes in the
  // server gateway. Merely configuring a compatible evaluation endpoint does
  // not silently change production routing.
  if (!v) {
    if (blackstarNativePrimaryEnabled()) return "compatible";
    if (process.env["GEMINI_API_KEY"]) return "gemini";
    if (process.env["GROQ_API_KEY"]) return "groq";
    if (process.env["OPENAI_API_KEY"]) return "openai";
    if (process.env["DEEPSEEK_API_KEY"]) return "deepseek";
    if (process.env["ANTHROPIC_API_KEY"]) return "anthropic";
  }
  return "lovable";
}

export function resolveModel(provider: Provider, model?: string | null): string {
  const m = (model ?? "").trim();
  if (!m && provider === "compatible" && blackstarNativePrimaryEnabled()) {
    const nativeModel = process.env["BLACKSTAR_NATIVE_MODEL"]?.trim();
    if (nativeModel) return nativeModel;
  }
  if (!m) return DEFAULT_MODEL[provider];
  // Lovable gateway models are namespaced (`vendor/model`); keep friendly names working.
  if (provider === "lovable" && !m.includes("/")) return DEFAULT_MODEL.lovable;
  return m;
}

type Endpoint = { url: string; headers: Record<string, string>; kind: "chat" | "anthropic" };

function endpointFor(provider: Provider): Endpoint {
  if (provider === "gemini") {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new ProviderError("Google Gemini is not configured for this workspace.", 503, false);
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      kind: "chat",
    };
  }
  if (provider === "openai") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new ProviderError("OpenAI is not configured for this workspace.", 503, false);
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      kind: "chat",
    };
  }
  if (provider === "anthropic") {
    const key = process.env["ANTHROPIC_API_KEY"];
    if (!key)
      throw new ProviderError("Anthropic is not configured for this workspace.", 503, false);
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      kind: "anthropic",
    };
  }
  if (provider === "groq") {
    const key = process.env["GROQ_API_KEY"];
    if (!key) throw new ProviderError("Groq is not configured for this workspace.", 503, false);
    return {
      url: "https://api.groq.com/openai/v1/chat/completions",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      kind: "chat",
    };
  }
  if (provider === "deepseek") {
    const key = process.env["DEEPSEEK_API_KEY"];
    if (!key) throw new ProviderError("DeepSeek is not configured for this workspace.", 503, false);
    const base = (process.env["DEEPSEEK_BASE_URL"] || "https://api.deepseek.com/v1").replace(/\/+$/, "");
    return {
      url: `${base}/chat/completions`,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      kind: "chat",
    };
  }
  if (provider === "compatible") {
    const base = process.env["OPENAI_COMPATIBLE_BASE_URL"];
    if (!base) throw new ProviderError("No OpenAI-compatible endpoint is configured.", 503, false);
    const key = process.env["OPENAI_COMPATIBLE_API_KEY"];
    return {
      url: `${base.replace(/\/+$/, "")}/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
      kind: "chat",
    };
  }
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new ProviderError("The AI gateway is not configured.", 503, false);
  return {
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    kind: "chat",
  };
}

/* -------------------------------------------------------------- request bodies */

/** GPT-5 family models reject `max_tokens` and require `max_completion_tokens`. */
function usesMaxCompletionTokens(provider: Provider, model: string): boolean {
  return provider === "openai" && model.trim().toLowerCase().startsWith("gpt-5");
}

export function chatBody(args: RunArgs, stream: boolean) {
  const messages = args.messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", tool_call_id: m.tool_call_id, content: m.content };
    }
    if (m.role === "assistant" && m.tool_calls?.length) {
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.tool_calls.map((t) => ({
          id: t.id,
          type: "function",
          function: { name: t.name, arguments: JSON.stringify(t.arguments) },
        })),
      };
    }
    return { role: m.role, content: m.content };
  });
  const cacheControl = resolveBlackstarAstraServingCacheControl(args.provider, args.model);

  return {
    model: args.model,
    messages,
    stream,
    ...cacheControl.request_fields,
    ...(stream ? { stream_options: { include_usage: true } } : {}),
    ...(args.temperature != null ? { temperature: args.temperature } : {}),
    ...(args.maxTokens
      ? usesMaxCompletionTokens(args.provider, args.model)
        ? { max_completion_tokens: args.maxTokens }
        : { max_tokens: args.maxTokens }
      : {}),
    ...(args.tools?.length
      ? {
          tools: args.tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.parameters },
          })),
        }
      : {}),
  };
}

function anthropicBody(args: RunArgs, stream: boolean) {
  const system = args.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const messages: Array<Record<string, unknown>> = [];
  for (const m of args.messages) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: m.tool_call_id, content: m.content }],
      });
      continue;
    }
    if (m.role === "assistant" && m.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: [
          ...(m.content ? [{ type: "text", text: m.content }] : []),
          ...m.tool_calls.map((t) => ({
            type: "tool_use",
            id: t.id,
            name: t.name,
            input: t.arguments,
          })),
        ],
      });
      continue;
    }
    messages.push({ role: m.role, content: m.content });
  }

  return {
    model: args.model,
    max_tokens: args.maxTokens ?? 4096,
    stream,
    ...(system ? { system } : {}),
    ...(args.temperature != null ? { temperature: args.temperature } : {}),
    messages,
    ...(args.tools?.length
      ? {
          tools: args.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.parameters,
          })),
        }
      : {}),
  };
}

/* ------------------------------------------------------------------- transport */

export type RunArgs = {
  provider: Provider;
  model: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number | null;
  maxTokens?: number | null;
  timeoutMs?: number;
  signal?: AbortSignal;
};

const RETRY_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function providerError(status: number, body: string) {
  const trimmed = body.slice(0, 400);
  if (status === 429) {
    let type = "";
    let code = "";
    try {
      const parsed = JSON.parse(body) as { error?: { type?: unknown; code?: unknown } };
      type = typeof parsed.error?.type === "string" ? parsed.error.type.toLowerCase() : "";
      code = typeof parsed.error?.code === "string" ? parsed.error.code.toLowerCase() : "";
    } catch {
      // Non-JSON provider errors remain ordinary retryable 429s.
    }
    if (
      type === "insufficient_quota" ||
      code === "insufficient_quota" ||
      code === "credit_balance_exhausted"
    ) {
      return new ProviderError("AI credits or quota are exhausted for this workspace.", 402, false);
    }
    return new ProviderError(
      "The model provider is rate limiting this workspace. Try again shortly.",
      429,
      true,
    );
  }
  if (status === 402)
    return new ProviderError("AI credits are exhausted for this workspace.", 402, false);
  if (status === 401 || status === 403)
    return new ProviderError("The model provider rejected the runtime credentials.", status, false);
  return new ProviderError(
    `Model provider error (${status}): ${trimmed}`,
    status,
    RETRY_STATUS.has(status),
  );
}

async function send(args: RunArgs, stream: boolean): Promise<Response> {
  const ep = endpointFor(args.provider);
  const body = ep.kind === "anthropic" ? anthropicBody(args, stream) : chatBody(args, stream);
  const timeout = args.timeoutMs ?? 90_000;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const timer = AbortSignal.timeout(timeout);
    const signal = args.signal ? anySignal([args.signal, timer]) : timer;
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: ep.headers,
        body: JSON.stringify(body),
        signal,
      });
      if (res.ok) return res;
      const text = await res.text();
      const err = providerError(res.status, text);
      if (!err.retryable || attempt === 2) throw err;
      lastError = err;
    } catch (error) {
      if (args.signal?.aborted) throw new ProviderError("Run cancelled.", 499, false);
      if (error instanceof ProviderError && !error.retryable) throw error;
      if (attempt === 2) {
        throw error instanceof ProviderError
          ? error
          : new ProviderError("The model provider did not respond in time.", 504, true);
      }
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
  }
  throw lastError instanceof Error
    ? lastError
    : new ProviderError("Model call failed.", 500, false);
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

/* ------------------------------------------------------------------ non-stream */

export async function runChat(args: RunArgs): Promise<ChatResult> {
  const res = await send(args, false);
  const json = (await res.json()) as any;

  if (args.provider === "anthropic") {
    const blocks: any[] = json.content ?? [];
    return {
      text: blocks
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim(),
      toolCalls: blocks
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ id: b.id, name: b.name, arguments: b.input ?? {} })),
      usage: { input: json.usage?.input_tokens ?? 0, output: json.usage?.output_tokens ?? 0 },
      provider: args.provider,
      model: args.model,
    };
  }

  const choice = json.choices?.[0]?.message ?? {};
  return {
    text: choice.content ?? "",
    toolCalls: (choice.tool_calls ?? []).map((t: any) => ({
      id: t.id,
      name: t.function?.name ?? "",
      arguments: safeJson(t.function?.arguments),
    })),
    usage: { input: json.usage?.prompt_tokens ?? 0, output: json.usage?.completion_tokens ?? 0 },
    provider: args.provider,
    model: args.model,
  };
}

/* ---------------------------------------------------------------------- stream */

export async function* streamChat(args: RunArgs): AsyncGenerator<StreamEvent> {
  const res = await send(args, true);
  if (!res.body) throw new ProviderError("Model provider returned no stream.", 502, true);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const toolMap = new Map<number, { id: string; name: string; args: string }>();
  let inputTokens = 0;
  let outputTokens = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let chunk: any;
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }

      if (args.provider === "anthropic") {
        if (chunk.type === "content_block_delta") {
          if (chunk.delta?.type === "text_delta" && chunk.delta.text) {
            text += chunk.delta.text;
            yield { type: "text", delta: chunk.delta.text };
          }
          if (chunk.delta?.type === "input_json_delta") {
            const idx = chunk.index ?? 0;
            const existing = toolMap.get(idx) ?? { id: "", name: "", args: "" };
            existing.args += chunk.delta.partial_json ?? "";
            toolMap.set(idx, existing);
          }
        }
        if (chunk.type === "content_block_start" && chunk.content_block?.type === "tool_use") {
          const idx = chunk.index ?? 0;
          toolMap.set(idx, {
            id: chunk.content_block.id ?? "",
            name: chunk.content_block.name ?? "",
            args: "",
          });
        }
        if (chunk.type === "message_start") inputTokens = chunk.message?.usage?.input_tokens ?? inputTokens;
        if (chunk.type === "message_delta") outputTokens = chunk.usage?.output_tokens ?? outputTokens;
        continue;
      }

      const delta = chunk.choices?.[0]?.delta ?? {};
      if (typeof delta.content === "string" && delta.content) {
        text += delta.content;
        yield { type: "text", delta: delta.content };
      }
      for (const tc of delta.tool_calls ?? []) {
        const idx = tc.index ?? 0;
        const existing = toolMap.get(idx) ?? { id: "", name: "", args: "" };
        if (tc.id) existing.id = tc.id;
        if (tc.function?.name) existing.name = tc.function.name;
        if (tc.function?.arguments) existing.args += tc.function.arguments;
        toolMap.set(idx, existing);
      }
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? inputTokens;
        outputTokens = chunk.usage.completion_tokens ?? outputTokens;
      }
    }
  }

  const toolCalls = [...toolMap.values()]
    .filter((t) => t.name)
    .map((t, index) => ({
      id: t.id || `tool-${index}`,
      name: t.name,
      arguments: safeJson(t.args),
    }));
  if (toolCalls.length) yield { type: "tool_calls", toolCalls };
  yield {
    type: "done",
    result: {
      text,
      toolCalls,
      usage: { input: inputTokens, output: outputTokens },
      provider: args.provider,
      model: args.model,
    },
  };
}

function safeJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
