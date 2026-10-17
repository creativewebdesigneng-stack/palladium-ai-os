/**
 * Embedding layer for the PalladiumAI memory system.
 *
 * The runtime is never hard-coded to one embedding vendor: the model is chosen
 * per call and can come from the Lovable AI gateway, OpenAI directly, or an
 * explicitly selected OpenAI-compatible endpoint. Automatic selection uses a
 * configured hosted embedding lane instead of assuming the deployment host.
 * All keys are read inside the request, server-side only.
 */

/** Every store/search in this system uses the same dimensionality. */
export const EMBEDDING_DIMENSIONS = 1536;

export type EmbeddingProvider = "lovable" | "openai" | "compatible";

export type EmbeddingResult = {
  vectors: number[][];
  model: string;
  provider: EmbeddingProvider;
};

const DEFAULT_MODEL: Record<EmbeddingProvider, string> = {
  lovable: "openai/text-embedding-3-small",
  openai: "text-embedding-3-small",
  compatible: "text-embedding-3-small",
};

export type EmbeddingErrorCode = "configuration" | "input" | "provider" | "quota" | "rate_limit" | "authentication";

export class EmbeddingError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
    readonly code?: EmbeddingErrorCode,
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

async function responseError(res: Response): Promise<EmbeddingError> {
  // Use structured classifications only. Provider messages can echo private input.
  const payload = await res.json().catch(() => null);
  const codes = [payload?.error?.code, payload?.error?.type];
  if (res.status === 402 || codes.some(code => [
    "insufficient_quota", "credit_balance_exhausted", "organization_spend_limit_exceeded",
    "organization_usage_limit_exceeded", "billing_hard_limit_reached",
  ].includes(code))) {
    return new EmbeddingError("Embedding quota or billing limit reached. Review the embedding provider account; keyword memory search remains available.", false, "quota");
  }
  if (res.status === 401 || res.status === 403) {
    return new EmbeddingError("The embedding provider rejected access. Review its credentials and permissions.", false, "authentication");
  }
  if (res.status === 429) return new EmbeddingError("Embedding rate limit reached — please retry later. Keyword memory search remains available.", true, "rate_limit");
  return new EmbeddingError(`Embedding provider returned HTTP ${res.status}.`, res.status >= 500, "provider");
}

function retryDelay(res: Response | undefined, attempt: number): number {
  const header = res?.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - Date.now();
    if (Number.isFinite(delay)) return Math.max(0, delay);
  }
  return 400 * 2 ** attempt;
}

function waitForRetry(delay: number, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, delay);
    signal.addEventListener("abort", abort, { once: true });
  });
}

function providerConfigured(provider: EmbeddingProvider): boolean {
  if (provider === "lovable") return Boolean(process.env["LOVABLE_API_KEY"]);
  if (provider === "openai") return Boolean(process.env["OPENAI_API_KEY"]);
  return Boolean(process.env["OPENAI_COMPATIBLE_BASE_URL"]);
}

/**
 * Chooses the active embedding lane without assuming the hosting platform.
 * "auto" preserves Lovable when available, otherwise uses direct OpenAI.
 * Compatible endpoints require an explicit opt-in because a configured chat
 * endpoint is not guaranteed to expose the requested embedding model.
 */
export function resolveEmbeddingProvider(preferred?: string | null): EmbeddingProvider {
  const requested = (preferred ?? process.env["EMBEDDING_PROVIDER"] ?? "auto")
    .trim()
    .toLowerCase();

  if (requested && requested !== "auto") {
    if (requested !== "lovable" && requested !== "openai" && requested !== "compatible") {
      throw new EmbeddingError(
        `Unsupported embedding provider "${requested}".`,
        false,
        "configuration",
      );
    }
    if (!providerConfigured(requested)) {
      throw new EmbeddingError(
        `The selected embedding provider "${requested}" is not configured.`,
        false,
        "configuration",
      );
    }
    return requested;
  }

  if (providerConfigured("lovable")) return "lovable";
  if (providerConfigured("openai")) return "openai";

  throw new EmbeddingError(
    "No embedding provider is configured. Keyword memory search remains available.",
    false,
    "configuration",
  );
}

function endpoint(provider: EmbeddingProvider): { url: string; headers: Record<string, string> } {
  if (provider === "openai") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key)
      throw new EmbeddingError("OpenAI is not configured for embeddings.", false, "configuration");
    return {
      url: "https://api.openai.com/v1/embeddings",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    };
  }
  if (provider === "compatible") {
    const base = process.env["OPENAI_COMPATIBLE_BASE_URL"];
    if (!base)
      throw new EmbeddingError(
        "No OpenAI-compatible endpoint is configured.",
        false,
        "configuration",
      );
    const key = process.env["OPENAI_COMPATIBLE_API_KEY"] ?? "";
    return {
      url: `${base.replace(/\/$/, "")}/embeddings`,
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
      },
    };
  }
  const key = process.env["LOVABLE_API_KEY"];
  if (!key)
    throw new EmbeddingError("The AI gateway is not configured.", false, "configuration");
  return {
    url: "https://ai.gateway.lovable.dev/v1/embeddings",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
  };
}

/** Embeds one or more texts. Empty inputs are rejected before any network call. */
export async function embedTexts(
  texts: string[],
  options: { provider?: EmbeddingProvider; model?: string; signal?: AbortSignal } = {},
): Promise<EmbeddingResult> {
  const input = texts
    .map((t) => (t ?? "").replace(/\s+/g, " ").trim().slice(0, 8000))
    .filter(Boolean);
  if (!input.length) throw new EmbeddingError("Nothing to embed.", false, "input");

  const provider = resolveEmbeddingProvider(options.provider);
  const model = options.model ?? process.env["EMBEDDING_MODEL"] ?? DEFAULT_MODEL[provider];
  const { url, headers } = endpoint(provider);
  // One budget covers every attempt and backoff, including caller cancellation.
  const deadline = Date.now() + 30_000;
  const timeout = AbortSignal.timeout(30_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    signal.throwIfAborted();
    let response: Response | undefined;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, input, dimensions: EMBEDDING_DIMENSIONS }),
        signal,
      });
      response = res;
      if (!res.ok) throw await responseError(res);

      const payload = (await res.json()) as {
        data?: Array<{ embedding: number[]; index?: number }>;
      };
      if (!Array.isArray(payload.data) || payload.data.some(row => !row || typeof row !== 'object')) {
        throw new EmbeddingError("The embedding provider returned invalid vectors. Memory was not indexed.", false, "provider");
      }
      const rows = [...payload.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const vectors = rows.map((r) => r.embedding);
      if (rows.length !== input.length || rows.some((row, index) =>
        (row.index !== undefined && row.index !== index) || !Array.isArray(row.embedding)
        || row.embedding.length !== EMBEDDING_DIMENSIONS || row.embedding.some(value => typeof value !== "number" || !Number.isFinite(value)))) {
        throw new EmbeddingError("The embedding provider returned invalid vectors. Memory was not indexed.", false, "provider");
      }
      return { vectors, model, provider };
    } catch (error) {
      signal.throwIfAborted();
      if (error instanceof EmbeddingError && !error.retryable) throw error;
      lastError = error instanceof EmbeddingError ? error : new EmbeddingError("The embedding provider could not be reached.", true, "provider");
    }
    if (attempt === 2) break;
    const delay = retryDelay(response, attempt);
    // Never retry before Retry-After or wait past the request budget.
    if (delay >= deadline - Date.now()) break;
    await waitForRetry(delay, signal);
  }
  throw lastError instanceof Error ? lastError : new EmbeddingError("Embedding failed.");
}

/** Convenience helper for a single string. */
export async function embedOne(text: string, options?: Parameters<typeof embedTexts>[1]) {
  const { vectors, model, provider } = await embedTexts([text], options);
  return { vector: vectors[0]!, model, provider };
}
