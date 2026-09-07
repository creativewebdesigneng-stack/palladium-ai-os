import { ProviderError } from "@/lib/runtime/model-gateway.base";

export type FreeLlmRouteIdentity = {
  routedVia: string;
  routedProvider: string;
  routedModel: string;
  fallbackAttempts: number;
};

export type FreeLlmJudgeResult = {
  text: string;
  usage: { input: number; output: number };
  provider: "freellm";
  model: string;
} & FreeLlmRouteIdentity;

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

export function parseFreeLlmRouteIdentity(headers: Headers): FreeLlmRouteIdentity {
  const routedVia = headers.get("x-routed-via")?.trim() || "";
  const slash = routedVia.indexOf("/");
  if (slash <= 0 || slash === routedVia.length - 1) {
    throw new ProviderError("FreeLLMAPI response did not include a valid X-Routed-Via identity.", 502, false);
  }
  const routedProvider = routedVia.slice(0, slash).trim();
  const routedModel = routedVia.slice(slash + 1).trim();
  if (!routedProvider || !routedModel) {
    throw new ProviderError("FreeLLMAPI response did not include a valid routed provider/model identity.", 502, false);
  }
  const rawAttempts = Number(headers.get("x-fallback-attempts") ?? 0);
  const fallbackAttempts = Number.isFinite(rawAttempts) && rawAttempts >= 0 ? Math.floor(rawAttempts) : 0;
  return { routedVia, routedProvider, routedModel, fallbackAttempts };
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

  const routeIdentity = parseFreeLlmRouteIdentity(response.headers);
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
    ...routeIdentity,
  };
}
