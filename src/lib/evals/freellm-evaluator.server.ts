import { ProviderError } from "@/lib/runtime/model-gateway.base";

export type FreeLlmJudgeResult = {
  text: string;
  usage: { input: number; output: number };
  provider: "freellm";
  model: string;
};

export function resolveFreeLlmEvaluatorConfig(env: NodeJS.ProcessEnv = process.env) {
  const baseUrl = env["FREELLMAPI_BASE_URL"]?.trim().replace(/\/+$/, "") || null;
  const apiKey = env["FREELLMAPI_API_KEY"]?.trim() || null;
  const model = env["FREELLMAPI_MODEL"]?.trim() || null;
  return {
    configured: Boolean(baseUrl && model),
    baseUrl,
    apiKey,
    model,
  } as const;
}

export async function runFreeLlmJudge(args: {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<FreeLlmJudgeResult> {
  const config = resolveFreeLlmEvaluatorConfig();
  if (!config.configured || !config.baseUrl || !config.model) {
    throw new ProviderError("FreeLLMAPI evaluator is not configured for this workspace.", 503, false);
  }
  if (args.model !== config.model) {
    throw new ProviderError(
      `FreeLLMAPI evaluator identity mismatch. Requested ${args.model}, configured ${config.model}.`,
      400,
      false,
    );
  }

  const timeout = args.timeoutMs ?? 90_000;
  const timer = AbortSignal.timeout(timeout);
  const controller = new AbortController();
  const forwardAbort = (signal: AbortSignal) => {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  };
  forwardAbort(timer);
  if (args.signal) forwardAbort(args.signal);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        messages: args.messages,
        stream: false,
        temperature: args.temperature ?? 0,
        max_tokens: args.maxTokens ?? 1400,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (args.signal?.aborted) throw new ProviderError("Run cancelled.", 499, false);
    throw new ProviderError("The FreeLLMAPI evaluator did not respond in time.", 504, true);
  }

  const body = await response.text();
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError("FreeLLMAPI rejected the evaluator credentials.", response.status, false);
    }
    if (response.status === 429) {
      throw new ProviderError("FreeLLMAPI is rate limiting the evaluator lane.", 429, true);
    }
    throw new ProviderError(`FreeLLMAPI evaluator error (${response.status}): ${body.slice(0, 400)}`, response.status, response.status >= 500);
  }

  let json: any;
  try {
    json = JSON.parse(body);
  } catch {
    throw new ProviderError("FreeLLMAPI returned invalid JSON.", 502, true);
  }
  const text = String(json.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new ProviderError("FreeLLMAPI returned an empty evaluator response.", 502, true);

  return {
    text,
    usage: {
      input: Number(json.usage?.prompt_tokens ?? 0),
      output: Number(json.usage?.completion_tokens ?? 0),
    },
    provider: "freellm",
    model: config.model,
  };
}
