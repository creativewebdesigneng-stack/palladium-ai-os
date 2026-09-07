import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "@/lib/platform/audit.server";
import { runChatPinned } from "./model-gateway.server";
import {
  BLACKSTAR_NATIVE_VERIFICATION_MARKER,
  BLACKSTAR_NATIVE_VERIFICATION_MAX_TOKENS,
  BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS,
  nativeVerificationPrompt,
  resolveNativeVerificationTarget,
} from "./native-runtime-verification";

export const verifyBlackstarNativeRuntime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const target = resolveNativeVerificationTarget();
    if (!target.configured || !target.model) {
      throw new Error(target.reason ?? "Blackstar native runtime is not configured.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("native-verification-timeout"), BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS);
    const started = Date.now();

    try {
      const result = await runChatPinned({
        provider: target.provider,
        model: target.model,
        messages: [{ role: "user", content: nativeVerificationPrompt() }],
        temperature: 0,
        maxTokens: BLACKSTAR_NATIVE_VERIFICATION_MAX_TOKENS,
        timeoutMs: BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS,
        signal: controller.signal,
      });
      const latencyMs = Math.max(0, Date.now() - started);

      if (result.provider !== target.provider || result.model !== target.model) {
        throw new Error(`Native verification transport changed identity from ${target.provider}/${target.model} to ${result.provider}/${result.model}.`);
      }
      if (result.text.trim() !== BLACKSTAR_NATIVE_VERIFICATION_MARKER) {
        throw new Error("Blackstar native runtime responded, but did not return the required verification marker.");
      }

      await writeAudit({
        userId: context.userId,
        action: "blackstar.native_runtime.verify",
        targetType: "model_runtime",
        targetId: `${result.provider}/${result.model}`,
        status: "success",
        metadata: {
          provider: result.provider,
          model: result.model,
          latency_ms: latencyMs,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
          verification_marker: BLACKSTAR_NATIVE_VERIFICATION_MARKER,
          evidence_scope: "runtime_execution_only",
          certification: false,
        },
      });

      return {
        verified: true as const,
        provider: result.provider,
        model: result.model,
        latencyMs,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        marker: BLACKSTAR_NATIVE_VERIFICATION_MARKER,
        evidenceScope: "runtime_execution_only" as const,
        certification: false as const,
      };
    } catch (error) {
      const timedOut = controller.signal.aborted;
      const latencyMs = Math.max(0, Date.now() - started);
      await writeAudit({
        userId: context.userId,
        action: "blackstar.native_runtime.verify",
        targetType: "model_runtime",
        targetId: `${target.provider}/${target.model}`,
        status: "failed",
        metadata: {
          provider: target.provider,
          model: target.model,
          latency_ms: latencyMs,
          reason: timedOut ? "timeout" : error instanceof Error ? error.message.slice(0, 500) : "unknown",
          evidence_scope: "runtime_execution_only",
          certification: false,
        },
      });
      if (timedOut) {
        throw new Error(`Blackstar native runtime did not complete verification within ${Math.round(BLACKSTAR_NATIVE_VERIFICATION_TIMEOUT_MS / 1000)} seconds.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });
