/**
 * Local-first Astra lane for Qwen3 8B Q4_K_M on an NVIDIA GTX 1080 Ti (11 GB).
 *
 * Pascal (compute capability 6.1) cannot run the pinned vLLM CUDA image, which
 * requires compute capability 7.0 or newer. Ollama / llama.cpp is the supported
 * runtime. vLLM remains an OpenAI-compatible option only when an operator
 * explicitly overrides the GPU assumption for a newer card.
 *
 * This module chooses config, clamps generation so an 11 GB card is less likely
 * to run out of memory, and decides when a failed local call may fall back to
 * an already configured provider. It does not grant tools or routing authority.
 */

export const BLACKSTAR_GTX1080TI_QWEN3_LANE = {
  id: "blackstar-native-gtx1080ti-qwen3-8b-q4",
  gpu: {
    name: "NVIDIA GeForce GTX 1080 Ti",
    vramMib: 11264,
    computeCapability: "6.1",
    architecture: "pascal",
  },
  model: "qwen3:8b-q4_K_M",
  optionalModelfileName: "blackstar-qwen3-8b-q4",
  quantization: "Q4_K_M",
  parameters: "8B",
  supportedRuntime: "ollama",
  /** Weights are about 5 GB. 8192 tokens leaves KV-cache headroom on 11 GB. */
  numCtx: 8192,
  maxNumCtx: 16384,
  maxOutputTokens: 2048,
  routineOutputTokens: 512,
  planningOutputTokens: 2048,
  /** Approximate character budget for an 8192-token window, leaving room for the reply. */
  maxPromptChars: 24000,
} as const;

export type AstraNativeRuntime = "ollama" | "vllm";

export type AstraNativeLaneProfile = {
  id: typeof BLACKSTAR_GTX1080TI_QWEN3_LANE.id;
  model: string;
  runtime: AstraNativeRuntime;
  hardwareCompatible: boolean;
  hardwareReason: string | null;
  numCtx: number;
  contextClamped: boolean;
  baseUrl: string | null;
  nativePrimary: boolean;
};

function enabled(value: string | undefined): boolean {
  const normalised = value?.trim().toLowerCase();
  return normalised === "1" || normalised === "true" || normalised === "yes" || normalised === "on";
}

export function isBlackstarNativePrimaryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    enabled(env["BLACKSTAR_NATIVE_PRIMARY"]) && Boolean(env["OPENAI_COMPATIBLE_BASE_URL"]?.trim())
  );
}

export function blackstarNativeModel(env: NodeJS.ProcessEnv = process.env): string {
  return (
    env["BLACKSTAR_NATIVE_MODEL"]?.trim() ||
    env["BLACKSTAR_ASTRA_MODEL"]?.trim() ||
    BLACKSTAR_GTX1080TI_QWEN3_LANE.model
  );
}

export function isGtx1080TiQwenLane(env: NodeJS.ProcessEnv = process.env): boolean {
  const lane = env["BLACKSTAR_NATIVE_LANE"]?.trim().toLowerCase();
  if (lane === "gtx1080ti-qwen3") return true;
  if (lane === "off" || lane === "disabled" || lane === "0" || lane === "false") return false;
  const model = (env["BLACKSTAR_NATIVE_MODEL"] || env["BLACKSTAR_ASTRA_MODEL"] || "").trim();
  const runtime = (env["BLACKSTAR_NATIVE_RUNTIME"] || "ollama").trim().toLowerCase();
  if (!model) return runtime !== "vllm";
  return (
    model === BLACKSTAR_GTX1080TI_QWEN3_LANE.model ||
    model === BLACKSTAR_GTX1080TI_QWEN3_LANE.optionalModelfileName
  );
}

export function resolveAstraNativeLaneProfile(
  env: NodeJS.ProcessEnv = process.env,
): AstraNativeLaneProfile {
  const requestedRuntime = (env["BLACKSTAR_NATIVE_RUNTIME"] || "ollama").trim().toLowerCase();
  const runtime: AstraNativeRuntime = requestedRuntime === "vllm" ? "vllm" : "ollama";
  const override = enabled(env["BLACKSTAR_NATIVE_GPU_OVERRIDE"]);
  const hardwareCompatible = runtime === "ollama" || override;
  const requestedCtx = Number(env["BLACKSTAR_NATIVE_NUM_CTX"]);
  const hasExplicitCtx = Number.isFinite(requestedCtx) && requestedCtx > 0;
  const capped = hasExplicitCtx
    ? Math.min(Math.round(requestedCtx), BLACKSTAR_GTX1080TI_QWEN3_LANE.maxNumCtx)
    : BLACKSTAR_GTX1080TI_QWEN3_LANE.numCtx;
  const numCtx = Math.max(2048, capped);
  return {
    id: BLACKSTAR_GTX1080TI_QWEN3_LANE.id,
    model: blackstarNativeModel(env),
    runtime,
    hardwareCompatible,
    hardwareReason: hardwareCompatible
      ? null
      : "vLLM CUDA builds in this bundle require compute capability 7.0 or newer. A GTX 1080 Ti is Pascal 6.1; use Ollama, or set BLACKSTAR_NATIVE_GPU_OVERRIDE only on a supported GPU.",
    numCtx,
    contextClamped: hasExplicitCtx && requestedCtx !== numCtx,
    baseUrl: env["OPENAI_COMPATIBLE_BASE_URL"]?.trim() || null,
    nativePrimary: isBlackstarNativePrimaryEnabled(env),
  };
}

export type AstraNativeTask = "chat" | "planning" | "coding" | "repair";

export function clampAstraNativeOutputTokens(
  task: AstraNativeTask,
  requested: number | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): { maxTokens: number; clamped: boolean } {
  const profile = resolveAstraNativeLaneProfile(env);
  if (!isGtx1080TiQwenLane(env) || !profile.hardwareCompatible) {
    const fallback =
      requested && requested > 0
        ? Math.round(requested)
        : BLACKSTAR_GTX1080TI_QWEN3_LANE.routineOutputTokens;
    return { maxTokens: fallback, clamped: false };
  }
  const ceiling =
    task === "chat"
      ? BLACKSTAR_GTX1080TI_QWEN3_LANE.routineOutputTokens
      : BLACKSTAR_GTX1080TI_QWEN3_LANE.maxOutputTokens;
  const desired = requested && requested > 0 ? Math.round(requested) : ceiling;
  const maxTokens = Math.min(Math.max(desired, 16), ceiling);
  return { maxTokens, clamped: desired !== maxTokens };
}

export function astraNativePromptTooLarge(
  messages: Array<{ content?: string | null }>,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isGtx1080TiQwenLane(env)) return false;
  const chars = messages.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);
  return chars > BLACKSTAR_GTX1080TI_QWEN3_LANE.maxPromptChars;
}

const QWEN_THINKING_DIRECTIVE = /(?:^|\s)\/(?:no_think|think)\s*$/i;

export function withQwenThinkingDirective(
  content: string,
  directive: "/no_think" | "/think",
): string {
  const trimmed = content.trim();
  if (QWEN_THINKING_DIRECTIVE.test(trimmed)) return trimmed;
  return `${trimmed} ${directive}`;
}

export function configuredFallbackProviders(
  env: NodeJS.ProcessEnv = process.env,
): Array<"gemini" | "groq" | "deepseek" | "openai" | "lovable" | "anthropic"> {
  const order = [
    ["gemini", "GEMINI_API_KEY"],
    ["groq", "GROQ_API_KEY"],
    ["deepseek", "DEEPSEEK_API_KEY"],
    ["openai", "OPENAI_API_KEY"],
    ["lovable", "LOVABLE_API_KEY"],
    ["anthropic", "ANTHROPIC_API_KEY"],
  ] as const;
  return order.filter(([, key]) => Boolean(env[key]?.trim())).map(([provider]) => provider);
}
