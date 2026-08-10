/**
 * Embedding layer for the PalladiumAI memory system.
 *
 * The runtime is never hard-coded to one embedding vendor: the model is chosen
 * per call and can come from the Lovable AI gateway (default, no keys needed),
 * OpenAI directly, or any OpenAI-compatible endpoint. All keys are read inside
 * the request, server-side only.
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

export class EmbeddingError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "EmbeddingError";
  }
}

function endpoint(provider: EmbeddingProvider): { url: string; headers: Record<string, string> } {
  if (provider === "openai") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new EmbeddingError("OpenAI is not configured for embeddings.");
    return {
      url: "https://api.openai.com/v1/embeddings",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    };
  }
  if (provider === "compatible") {
    const base = process.env["OPENAI_COMPATIBLE_BASE_URL"];
    if (!base) throw new EmbeddingError("No OpenAI-compatible endpoint is configured.");
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
  if (!key) throw new EmbeddingError("The AI gateway is not configured.");
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
  if (!input.length) throw new EmbeddingError("Nothing to embed.");

  const provider = options.provider ?? "lovable";
  const model = options.model ?? DEFAULT_MODEL[provider];
  const { url, headers } = endpoint(provider);

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, input, dimensions: EMBEDDING_DIMENSIONS }),
        signal: options.signal ?? AbortSignal.timeout(30_000),
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new EmbeddingError(
          res.status === 429
            ? "Embedding rate limit reached — please retry shortly."
            : "The embedding provider is unavailable.",
          true,
        );
        await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
        continue;
      }
      if (res.status === 402)
        throw new EmbeddingError("AI credits are exhausted. Top up to keep indexing memory.");
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new EmbeddingError(`Embedding failed (${res.status}). ${detail.slice(0, 200)}`);
      }

      const payload = (await res.json()) as {
        data?: Array<{ embedding: number[]; index?: number }>;
      };
      const rows = [...(payload.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      const vectors = rows.map((r) => r.embedding).filter((v) => Array.isArray(v) && v.length > 0);
      if (!vectors.length) throw new EmbeddingError("The embedding provider returned no vectors.");
      return { vectors, model, provider };
    } catch (error) {
      if (error instanceof EmbeddingError && !error.retryable) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new EmbeddingError("Embedding failed.");
}

/** Convenience helper for a single string. */
export async function embedOne(text: string, options?: Parameters<typeof embedTexts>[1]) {
  const { vectors, model, provider } = await embedTexts([text], options);
  return { vector: vectors[0]!, model, provider };
}
