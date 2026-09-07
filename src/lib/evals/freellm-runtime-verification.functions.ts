import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'
import { resolveFreeLlmEvaluatorConfig, runFreeLlmJudge } from './freellm-evaluator.server'
import {
  FREELLM_VERIFICATION_MARKER,
  FREELLM_VERIFICATION_MAX_TOKENS,
  FREELLM_VERIFICATION_TIMEOUT_MS,
  freeLlmVerificationPrompt,
  isFreeLlmVerificationMarker,
} from './freellm-runtime-verification'

export const verifyFreeLlmEvaluatorRuntime = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const config = resolveFreeLlmEvaluatorConfig()
    if (!config.configured || !config.model) {
      throw new Error('FreeLLMAPI evaluator is not configured on this deployment.')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort('freellm-verification-timeout'), FREELLM_VERIFICATION_TIMEOUT_MS)
    const started = Date.now()

    try {
      const result = await runFreeLlmJudge({
        model: config.model,
        messages: [{ role: 'user', content: freeLlmVerificationPrompt() }],
        temperature: 0,
        maxTokens: FREELLM_VERIFICATION_MAX_TOKENS,
        timeoutMs: FREELLM_VERIFICATION_TIMEOUT_MS,
        signal: controller.signal,
      })
      const latencyMs = Math.max(0, Date.now() - started)

      if (result.provider !== 'freellm' || result.model !== config.model) {
        throw new Error(`FreeLLM evaluator verification changed identity to ${result.provider}/${result.model}.`)
      }
      if (!isFreeLlmVerificationMarker(result.text)) {
        throw new Error('FreeLLM evaluator responded, but did not return the required verification marker.')
      }

      await writeAudit({
        userId: context.userId,
        action: 'blackstar.freellm_evaluator.verify',
        targetType: 'model_evaluator',
        targetId: `freellm/${result.model}`,
        status: 'success',
        metadata: {
          provider: result.provider,
          model: result.model,
          latency_ms: latencyMs,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
          verification_marker: FREELLM_VERIFICATION_MARKER,
          evidence_scope: 'evaluator_transport_only',
          certification: false,
        },
      })

      return {
        verified: true as const,
        provider: result.provider,
        model: result.model,
        latencyMs,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        marker: FREELLM_VERIFICATION_MARKER,
        evidenceScope: 'evaluator_transport_only' as const,
        certification: false as const,
      }
    } catch (error) {
      const timedOut = controller.signal.aborted
      const latencyMs = Math.max(0, Date.now() - started)
      await writeAudit({
        userId: context.userId,
        action: 'blackstar.freellm_evaluator.verify',
        targetType: 'model_evaluator',
        targetId: `freellm/${config.model}`,
        status: 'failed',
        metadata: {
          provider: 'freellm',
          model: config.model,
          latency_ms: latencyMs,
          reason: timedOut ? 'timeout' : error instanceof Error ? error.message.slice(0, 500) : 'unknown',
          evidence_scope: 'evaluator_transport_only',
          certification: false,
        },
      })
      if (timedOut) throw new Error('FreeLLM evaluator did not complete verification within 30 seconds.')
      throw error
    } finally {
      clearTimeout(timeout)
    }
  })
