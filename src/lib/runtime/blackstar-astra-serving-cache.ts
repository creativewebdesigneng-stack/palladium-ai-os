import type { Provider } from './model-gateway.base'
import { isBlackstarAstraServingIdentity } from './blackstar-astra-engine-profile'

export type BlackstarAstraServingCacheMode = 'none' | 'cache_prompt'

export type BlackstarAstraServingCacheControl = {
  version: 1
  enabled: boolean
  mode: BlackstarAstraServingCacheMode
  request_fields: Record<string, true>
  rationale: string
}

/**
 * Opt-in serving cache policy for Blackstar-owned Astra-compatible endpoints.
 *
 * `cache_prompt` is intentionally disabled by default because it is an
 * extension understood by some OpenAI-compatible serving stacks, not a
 * universal OpenAI-compatible field. Operators must enable it only when the
 * configured Blackstar serving backend genuinely supports that request field.
 *
 * This policy changes serving efficiency only. It never changes routing,
 * model identity, tools, approvals, delegation, identity or execution rights.
 */
export function resolveBlackstarAstraServingCacheControl(
  provider: Provider,
  model?: string | null,
  configuredMode = process.env['BLACKSTAR_ASTRA_PREFIX_CACHE_MODE'],
): BlackstarAstraServingCacheControl {
  const rawMode = (configuredMode ?? '').trim().toLowerCase()
  const exactAstraIdentity = isBlackstarAstraServingIdentity(provider, model)
  const enabled = exactAstraIdentity && rawMode === 'cache_prompt'

  return enabled
    ? {
        version: 1,
        enabled: true,
        mode: 'cache_prompt',
        request_fields: { cache_prompt: true },
        rationale: 'The exact configured Blackstar Astra serving identity is opted into the backend cache_prompt extension.',
      }
    : {
        version: 1,
        enabled: false,
        mode: 'none',
        request_fields: {},
        rationale: exactAstraIdentity
          ? 'No supported Blackstar Astra prefix-cache request mode is configured.'
          : 'Prompt-cache requests are restricted to exact configured Blackstar Astra serving identities.',
      }
}

export function blackstarAstraCompatibleCachePrompt(
  provider: Provider,
  model?: string | null,
): boolean {
  return resolveBlackstarAstraServingCacheControl(provider, model).enabled
}
