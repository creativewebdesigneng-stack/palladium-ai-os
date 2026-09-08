import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { writeAudit } from '@/lib/platform/audit.server'
import { isIndependentFreeLlmRouteProvider } from './astra-certification-judge-policy'
import { matchesPinnedFreeLlmRoute, resolveFreeLlmEvaluatorConfig, runFreeLlmJudge } from './freellm-evaluator.server'
import {
  FREELLM_VERIFICATION_MARKER,
  FREELLM_VERIFICATION_MAX_TOKENS,
  FREELLM_VERIFICATION_TIMEOUT_MS,
  freeLlmVerificationPrompt,
  isFreeLlmVerificationMarker,
} from './freellm-runtime-verification'

type FailureCode =
  | 'not_configured'
  | 'upstream_connection_refused'
  | 'upstream_connection_reset'
  | 'upstream_timeout'
  | 'upstream_unreachable'
  | 'upstream_502'
  | 'credentials_rejected'
  | 'rate_limited'
  | 'route_mismatch'
  | 'route_not_independent'
  | 'marker_missing'
  | 'timeout'
  | 'verification_failed'

function safeFailure(error: unknown, timedOut = false): { code: FailureCode; message: string } {
  if (timedOut) return { code: 'timeout', message: 'FreeLLM evaluator did not complete verification within 30 seconds.' }
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const lower = raw.toLowerCase()
  if (lower.includes('not fully pinned') || lower.includes('not configured')) return { code: 'not_configured', message: 'Authenticated FreeLLMAPI evaluator transport is not fully pinned on this deployment.' }
  if (lower.includes('upstream_connection_refused')) return { code: 'upstream_connection_refused', message: 'The local FreeLLM bridge could not connect to the FreeLLMAPI desktop listener.' }
  if (lower.includes('upstream_connection_reset')) return { code: 'upstream_connection_reset', message: 'The FreeLLMAPI desktop connection was reset while Blackstar was verifying the evaluator.' }
  if (lower.includes('upstream_timeout')) return { code: 'upstream_timeout', message: 'The FreeLLMAPI desktop or its upstream provider timed out.' }
  if (lower.includes('upstream_unreachable')) return { code: 'upstream_unreachable', message: 'The FreeLLMAPI desktop listener is unreachable from the local bridge.' }
  if (lower.includes('evaluator error (502)') || lower.includes('error code: 502')) return { code: 'upstream_502', message: 'The FreeLLM bridge returned HTTP 502 while contacting the evaluator upstream.' }
  if (lower.includes('credentials')) return { code: 'credentials_rejected', message: 'FreeLLMAPI rejected the evaluator credentials.' }
  if (lower.includes('rate limiting')) return { code: 'rate_limited', message: 'FreeLLMAPI is rate limiting the evaluator lane.' }
  if (lower.includes('instead of the exact pinned upstream') || lower.includes('changed identity')) return { code: 'route_mismatch', message: raw.slice(0, 500) }
  if (lower.includes('independently acceptable upstream provider')) return { code: 'route_not_independent', message: 'FreeLLM did not resolve through an independently acceptable upstream provider.' }
  if (lower.includes('verification marker')) return { code: 'marker_missing', message: 'FreeLLM responded, but did not return the required verification marker.' }
  return { code: 'verification_failed', message: 'Independent evaluator verification failed. Check the FreeLLM bridge diagnostic code and local FreeLLMAPI status.' }
}

export const verifyFreeLlmEvaluatorRuntime = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const config = resolveFreeLlmEvaluatorConfig()
    const started = Date.now()

    if (!config.certificationConfigured || !config.baseUrl || !config.apiKey || !config.model || !config.routedProvider || !config.routedModel) {
      const failure = safeFailure(new Error('Authenticated FreeLLMAPI evaluator transport is not fully pinned on this deployment.'))
      await writeAudit({
        userId: context.userId,
        action: 'blackstar.freellm_evaluator.verify',
        targetType: 'model_evaluator',
        targetId: `freellm/${config.model ?? 'unconfigured'}`,
        status: 'failed',
        metadata: { reason_code: failure.code, evidence_scope: 'independent_evaluator_transport', certification: false },
      })
      return { verified: false as const, ...failure, certification: false as const }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort('freellm-verification-timeout'), FREELLM_VERIFICATION_TIMEOUT_MS)

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
      if (!matchesPinnedFreeLlmRoute(result)) {
        throw new Error(`FreeLLM evaluator verification routed to ${result.routedProvider}/${result.routedModel} instead of the exact pinned upstream ${config.routedProvider}/${config.routedModel}.`)
      }
      if (!isIndependentFreeLlmRouteProvider(result.routedProvider)) {
        throw new Error('FreeLLM evaluator verification did not resolve through an independently acceptable upstream provider.')
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
          routed_via: result.routedVia,
          routed_provider: result.routedProvider,
          routed_model: result.routedModel,
          fallback_attempts: result.fallbackAttempts,
          latency_ms: latencyMs,
          input_tokens: result.usage.input,
          output_tokens: result.usage.output,
          verification_marker: FREELLM_VERIFICATION_MARKER,
          evidence_scope: 'independent_evaluator_transport',
          certification: false,
        },
      })

      return {
        verified: true as const,
        provider: result.provider,
        model: result.model,
        routedVia: result.routedVia,
        routedProvider: result.routedProvider,
        routedModel: result.routedModel,
        fallbackAttempts: result.fallbackAttempts,
        latencyMs,
        inputTokens: result.usage.input,
        outputTokens: result.usage.output,
        marker: FREELLM_VERIFICATION_MARKER,
        evidenceScope: 'independent_evaluator_transport' as const,
        certification: false as const,
      }
    } catch (error) {
      const timedOut = controller.signal.aborted
      const latencyMs = Math.max(0, Date.now() - started)
      const failure = safeFailure(error, timedOut)
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
          reason_code: failure.code,
          evidence_scope: 'independent_evaluator_transport',
          certification: false,
        },
      })
      return { verified: false as const, ...failure, latencyMs, certification: false as const }
    } finally {
      clearTimeout(timeout)
    }
  })
