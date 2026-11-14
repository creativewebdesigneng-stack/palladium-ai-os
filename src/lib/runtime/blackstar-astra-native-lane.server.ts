import type { ChatMessage, ChatResult, Provider, RunArgs } from "./model-gateway.base";
import { ProviderError } from "./model-gateway.base";
import {
  probeBlackstarAstraServingReadiness,
  type BlackstarAstraServingHealth,
} from "./blackstar-astra-serving-readiness.server";
import {
  classifyAstraNativeFailure,
  type AstraNativeFailureCode,
} from "./blackstar-astra-native-errors";
import {
  recordAstraInference,
  type AstraInferenceTelemetry,
} from "./blackstar-astra-inference-telemetry";
import {
  astraNativePromptTooLarge,
  BLACKSTAR_GTX1080TI_QWEN3_LANE,
  clampAstraNativeOutputTokens,
  configuredFallbackProviders,
  isGtx1080TiQwenLane,
  resolveAstraNativeLaneProfile,
  withQwenThinkingDirective,
  type AstraNativeTask,
} from "./blackstar-astra-native-lane";
import { astraNativeIdentityLine } from "./blackstar-astra-native-prompts";

export type AstraNativeLaneResult = ChatResult & { astraTelemetry: AstraInferenceTelemetry };

type Invoke = (args: RunArgs) => Promise<ChatResult>;

function promptChars(messages: ChatMessage[]): number {
  return messages.reduce((sum, message) => sum + (message.content?.length ?? 0), 0);
}

function visibleText(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function prepareMessages(messages: ChatMessage[], task: AstraNativeTask): ChatMessage[] {
  const directive = task === "planning" || task === "repair" ? "/think" : "/no_think";
  const copy = messages.map((message) => ({ ...message }));
  const identity = astraNativeIdentityLine();
  if (
    !copy.some(
      (message) => message.role === "system" && message.content.includes("Local model identity:"),
    )
  ) {
    copy.unshift({ role: "system", content: identity });
  }
  for (let index = copy.length - 1; index >= 0; index -= 1) {
    const message = copy[index];
    if (message?.role === "user") {
      copy[index] = { ...message, content: withQwenThinkingDirective(message.content, directive) };
      break;
    }
  }
  return copy;
}

function telemetry(args: {
  profile: ReturnType<typeof resolveAstraNativeLaneProfile>;
  health: AstraInferenceTelemetry["health"];
  started: number;
  now: number;
  result?: ChatResult | null;
  fallback: boolean;
  errorCode: AstraNativeFailureCode | null;
  outputClamped: boolean;
  promptChars: number;
}): AstraInferenceTelemetry {
  const served = args.result?.model ?? null;
  return recordAstraInference({
    version: 1,
    at: new Date(args.now).toISOString(),
    lane: BLACKSTAR_GTX1080TI_QWEN3_LANE.id,
    runtime: args.profile.runtime,
    requested_model: args.profile.model,
    served_model: served,
    provider: args.result?.provider ?? null,
    identity_match: Boolean(
      served &&
      served === args.profile.model &&
      args.result?.provider === "compatible" &&
      !args.fallback,
    ),
    health: args.health,
    latency_ms: Math.max(0, args.now - args.started),
    usage: {
      input: args.result?.usage.input ?? 0,
      output: args.result?.usage.output ?? 0,
    },
    fallback: args.fallback,
    fallback_from: args.fallback ? args.profile.model : null,
    error_code: args.errorCode,
    output_clamped: args.outputClamped,
    context_clamped: args.profile.contextClamped,
    prompt_chars: args.promptChars,
  });
}

async function invokeFallback(
  args: RunArgs,
  invoke: Invoke,
  providers: Provider[],
): Promise<ChatResult> {
  let lastError: unknown;
  for (const provider of providers) {
    if (provider === "compatible") continue;
    try {
      return await invoke({ ...args, provider, model: "" });
    } catch (error) {
      if (error instanceof ProviderError && error.status === 499) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new ProviderError("No configured AI provider could complete the request.", 503, false);
}

/**
 * Runs the local Qwen lane first. A connection, quota, missing-model, or
 * resource failure falls back to providers that are already configured.
 * Exact certification calls must keep using the pinned gateway path.
 */
export async function executeAstraNativeLane(
  args: RunArgs & {
    task?: AstraNativeTask;
    invoke: Invoke;
    fallbackProviders?: Provider[];
    fetchImpl?: typeof fetch;
    now?: () => number;
  },
): Promise<AstraNativeLaneResult> {
  const now = args.now ?? Date.now;
  const started = now();
  const profile = resolveAstraNativeLaneProfile();
  const task = args.task ?? "chat";
  const { maxTokens, clamped } = clampAstraNativeOutputTokens(task, args.maxTokens);
  const fallbackProviders = (args.fallbackProviders ?? configuredFallbackProviders()).filter(
    (provider) => !args.allowedProviders || args.allowedProviders.includes(provider),
  );
  const messages = prepareMessages(args.messages, task);
  const chars = promptChars(messages);

  const finish = (
    result: ChatResult,
    health: AstraInferenceTelemetry["health"],
    fallback: boolean,
    errorCode: AstraNativeFailureCode | null,
  ) => {
    const astraTelemetry = telemetry({
      profile,
      health,
      started,
      now: now(),
      result,
      fallback,
      errorCode,
      outputClamped: clamped,
      promptChars: chars,
    });
    return { ...result, astraTelemetry };
  };

  if (!profile.nativePrimary || !profile.baseUrl) {
    throw new ProviderError(
      "Blackstar native inference is not configured on this deployment.",
      503,
      false,
    );
  }
  if (!profile.hardwareCompatible) {
    if (!fallbackProviders.length) {
      throw new ProviderError(
        profile.hardwareReason ??
          "The selected native runtime is not supported on the GTX 1080 Ti lane.",
        503,
        false,
      );
    }
    const result = await invokeFallback(args, args.invoke, fallbackProviders);
    return finish(result, "unavailable", true, "provider");
  }
  if (astraNativePromptTooLarge(messages)) {
    if (!fallbackProviders.length) {
      throw new ProviderError(
        "The prompt is larger than the local 8192-token Qwen3 window. Shorten it or configure another provider.",
        413,
        false,
      );
    }
    const result = await invokeFallback(
      { ...args, messages: args.messages, maxTokens },
      args.invoke,
      fallbackProviders,
    );
    return finish(result, "unavailable", true, "context_overflow");
  }

  const readiness = await probeBlackstarAstraServingReadiness({
    model: profile.model,
    now: started,
    force: true,
    ...(args.fetchImpl ? { fetchImpl: args.fetchImpl } : {}),
  });
  const health: BlackstarAstraServingHealth = readiness.health;
  if (!readiness.ready) {
    if (!fallbackProviders.length) {
      throw new ProviderError(
        "The local Astra model is not ready. Check Ollama and the configured model identity.",
        503,
        true,
      );
    }
    const result = await invokeFallback({ ...args, maxTokens }, args.invoke, fallbackProviders);
    return finish(
      result,
      health,
      true,
      readiness.reason === "model_missing" ? "model_missing" : "connection",
    );
  }

  const localArgs: RunArgs = {
    ...args,
    provider: "compatible",
    model: profile.model,
    messages,
    maxTokens,
    allowedProviders: ["compatible"],
  };
  let localError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await args.invoke(localArgs);
      const empty = !visibleText(result.text) && result.toolCalls.length === 0;
      if (!empty) return finish(result, health, false, null);
      localError = new ProviderError("The local model returned no visible output.", 502, true);
      if (attempt === 0) continue;
      break;
    } catch (error) {
      const recovery = classifyAstraNativeFailure(error);
      if (recovery.action === "fail") {
        telemetry({
          profile,
          health,
          started,
          now: now(),
          result: null,
          fallback: false,
          errorCode: recovery.code,
          outputClamped: clamped,
          promptChars: chars,
        });
        throw error;
      }
      localError = error;
      break;
    }
  }

  const recovery = classifyAstraNativeFailure(localError);
  const errorCode: AstraNativeFailureCode =
    localError instanceof ProviderError && localError.message.includes("no visible output")
      ? "empty_output"
      : recovery.code;
  if (!fallbackProviders.length) {
    throw localError instanceof Error
      ? localError
      : new ProviderError("The local Astra model could not complete the request.", 503, false);
  }
  const result = await invokeFallback({ ...args, maxTokens }, args.invoke, fallbackProviders);
  return finish(result, health, true, errorCode);
}

export function shouldUseAstraNativeLane(args: {
  provider: Provider;
  model?: string | null;
  allowedProviders?: Provider[];
}): boolean {
  if (args.provider !== "compatible") return false;
  if (args.allowedProviders && !args.allowedProviders.includes("compatible")) return false;
  if (!isGtx1080TiQwenLane() || !resolveAstraNativeLaneProfile().nativePrimary) return false;
  const requested = (args.model ?? "").trim();
  const native = resolveAstraNativeLaneProfile().model;
  return !requested || requested === native || requested === "local-model";
}
