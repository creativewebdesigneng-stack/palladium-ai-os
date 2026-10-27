/** Authenticated, admin-only native benchmark diagnostics.
 * Not independent Astra certification: pure exact-key grading with no judge,
 * and no browser/agent tool action or external-service write.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isPlatformAdmin } from "@/lib/marketplace/marketplace.server";
import { writeAudit } from "@/lib/platform/audit.server";
import { runChatPinned } from "./model-gateway.server";
import { resolveNativeVerificationTarget } from "./native-runtime-verification";
import { findAstraNativeDiagnosticCase, scoreAstraNativeDiagnostic, ASTRA_NATIVE_DIAGNOSTIC_VERSION } from "./astra-native-diagnostics";

const TIMEOUT_MS = 45_000;
const MAX_TOKENS = 240;

export const runBlackstarNativeDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    caseId: z.string().min(1).max(40),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as { from: (table: string) => any; rpc: (name: string, args?: Record<string, unknown>) => any };
    if (!(await isPlatformAdmin(sb, context.userId))) return { forbidden: true as const };
    const fixture = findAstraNativeDiagnosticCase(data.caseId);
    if (!fixture) throw new Error("Unknown server-owned Astra diagnostic case.");

    const target = resolveNativeVerificationTarget();
    if (!target.configured || !target.model) {
      return { forbidden: false as const, caseId: fixture.id, executed: false as const, passed: false as const, failure: "native_runtime_not_configured" as const };
    }

    const model = target.model;
    const started = Date.now();
    try {
      const result = await runChatPinned({
        provider: target.provider,
        model,
        messages: [{ role: "user", content: fixture.prompt }],
        temperature: 0,
        maxTokens: MAX_TOKENS,
        timeoutMs: TIMEOUT_MS,
        maxAttempts: 1,
        ...( /(?:^|[\\/:-])qwen3(?:[:._-]|$)/i.test(model) ? { reasoningEffort: "none" as const } : {} ),
      });
      const latencyMs = Math.max(0, Date.now() - started);
      if (result.provider !== target.provider || result.model !== model) {
        throw new Error("pinned_identity_mismatch");
      }
      const grade = scoreAstraNativeDiagnostic(fixture.id, result.text);
      await writeAudit({
        userId: context.userId,
        action: "blackstar.native_runtime.diagnostic",
        targetType: "model_runtime",
        targetId: `${result.provider}/${result.model}`,
        status: grade.passed ? "success" : "failed",
        metadata: {
          diagnostic_version: ASTRA_NATIVE_DIAGNOSTIC_VERSION,
          case_id: fixture.id,
          task_class: fixture.category,
          verdict: grade.verdict,
          passed: grade.passed,
          latency_ms: latencyMs,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
          evidence_scope: "native_model_diagnostic_only",
          certification: false,
        },
      });
      return {
        forbidden: false as const,
        executed: true as const,
        caseId: fixture.id,
        category: fixture.category,
        passed: grade.passed,
        verdict: grade.verdict,
        provider: result.provider,
        model: result.model,
        latencyMs,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        responseExcerpt: result.text.slice(0, 400),
        diagnosticVersion: ASTRA_NATIVE_DIAGNOSTIC_VERSION,
        certification: false as const,
      };
    } catch (error) {
      // Never forward raw gateway errors: they might contain credentials,
      // internal hostnames, or a transient tunnel address.
      const reason = error instanceof Error && error.message === "pinned_identity_mismatch"
        ? "pinned_identity_mismatch" as const
        : "native_model_request_failed" as const;
      await writeAudit({
        userId: context.userId,
        action: "blackstar.native_runtime.diagnostic",
        targetType: "model_runtime",
        targetId: `${target.provider}/${model}`,
        status: "failed",
        metadata: {
          diagnostic_version: ASTRA_NATIVE_DIAGNOSTIC_VERSION,
          case_id: fixture.id,
          failure: reason,
          latency_ms: Math.max(0, Date.now() - started),
          evidence_scope: "native_model_diagnostic_only",
          certification: false,
        },
      });
      return { forbidden: false as const, caseId: fixture.id, executed: false as const, passed: false as const, failure: reason };
    }
  });
