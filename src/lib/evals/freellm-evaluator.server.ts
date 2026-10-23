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
  const routedProvider = env["FREELLMAPI_ROUTED_PROVIDER"]?.trim() || null;
  const routedModel = env["FREELLMAPI_ROUTED_MODEL"]?.trim() || null;
  return {
    configured: Boolean(baseUrl && model),
    certificationConfigured: Boolean(baseUrl && apiKey && model && routedProvider && routedModel),
    baseUrl,
    apiKey,
    model,
    routedProvider,
    routedModel,
  } as const;
}

export function parseFreeLlmRouteIdentity(
  headers: Headers,
  env: NodeJS.ProcessEnv = process.env,
): FreeLlmRouteIdentity {
  const routedVia = headers.get("x-routed-via")?.trim() || "";
  const segments = routedVia.split("/").map((segment) => segment.trim()).filter(Boolean);
  if (segments.length < 2 || segments.some((segment) => segment !== segment.trim())) {
    throw new ProviderError("FreeLLMAPI response did not include a valid X-Routed-Via identity.", 502, false);
  }
  const config = resolveFreeLlmEvaluatorConfig(env);
  // A pinned upstream model may itself contain slashes (e.g. openai/gpt-oss).
  // Taking only the final two segments would silently change its identity.
  // Accept the exact pinned provider/model suffix, with optional router prefix;
  // all other identities retain the legacy parser and fail the pinned check.
  const pinnedSuffix = config.routedProvider && config.routedModel
    ? `${config.routedProvider}/${config.routedModel}`
    : null;
  const exactPinnedRoute = Boolean(pinnedSuffix && (
    routedVia === pinnedSuffix || routedVia.endsWith(`/${pinnedSuffix}`)
  ));
  const routedProvider = exactPinnedRoute ? config.routedProvider! : segments.at(-2) || "";
  const routedModel = exactPinnedRoute ? config.routedModel! : segments.at(-1) || "";
  if (!routedProvider || !routedModel) {
    throw new ProviderError("FreeLLMAPI response did not include a valid routed provider/model identity.", 502, false);
  }
  const rawAttempts = Number(headers.get("x-fallback-attempts") ?? 0);
  const fallbackAttempts = Number.isFinite(rawAttempts) && rawAttempts >= 0 ? Math.floor(rawAttempts) : 0;
  return { routedVia, routedProvider, routedModel, fallbackAttempts };
}

export function matchesPinnedFreeLlmRoute(
  route: Pick<FreeLlmRouteIdentity, "routedProvider" | "routedModel">,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const config = resolveFreeLlmEvaluatorConfig(env);
  return Boolean(
    config.certificationConfigured
      && config.routedProvider
      && config.routedModel
      && route.routedProvider === config.routedProvider
      && route.routedModel === config.routedModel,
  );
}

const MAX_FREELLM_RESPONSE_BYTES = 256 * 1024;

/** Consume untrusted evaluator output without buffering an unbounded response. */
async function readBoundedFreeLlmResponse(response: Response): Promise<string> {
  const declaredBytes = response.headers.get("content-length");
  if (declaredBytes && Number.isFinite(Number(declaredBytes))
    && Number(declaredBytes) > MAX_FREELLM_RESPONSE_BYTES) {
    throw new ProviderError("FreeLLMAPI returned an oversized evaluator response.", 502, false);
  }
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FREELLM_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {});
        throw new ProviderError("FreeLLMAPI returned an oversized evaluator response.", 502, false);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let position = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, position);
    position += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
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
      // Never forward evaluator authorization or scoring prompts to a
      // redirected endpoint. Treat redirects as transport failures.
      redirect: "error",
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

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError("FreeLLMAPI rejected the evaluator credentials.", response.status, false);
    }
    if (response.status === 429) {
      throw new ProviderError("FreeLLMAPI is rate limiting the evaluator lane.", 429, true);
    }
    // Remote error documents are untrusted and may echo credentials or prompts.
    throw new ProviderError(`FreeLLMAPI evaluator error (${response.status}).`, response.status, response.status >= 500);
  }

  const routeIdentity = parseFreeLlmRouteIdentity(response.headers);
  const body = await readBoundedFreeLlmResponse(response);
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
