import type { Provider } from './model-gateway.base'
import { blackstarAstraModelDescriptor } from './blackstar-astra-engine-profile'

export const BLACKSTAR_ASTRA_CONTEXT_COMPACT_AT_CHARS = 2_800_000
export const BLACKSTAR_ASTRA_CONTEXT_TARGET_CHARS = 2_200_000
export const BLACKSTAR_ASTRA_CONTEXT_PRESERVE_RECENT_TOOL_ROUNDS = 4

export type BlackstarAstraContextCompactionOptions = {
  compactAtChars: number
  targetChars: number
  preserveRecentToolRounds: number
}

/**
 * Enlarges only the model-context budget for the exact configured Astra serving
 * identity. Persisted memory, audit records, approvals and tool authority are
 * unchanged. The character budget deliberately leaves substantial headroom
 * inside the engine's 1M-token target for generation and protocol overhead.
 */
export function blackstarAstraContextCompactionOptions(
  provider: Provider,
  model?: string | null,
): BlackstarAstraContextCompactionOptions | undefined {
  const configured = blackstarAstraModelDescriptor()
  if (provider !== configured.provider || (model ?? '').trim() !== configured.model) return undefined
  return {
    compactAtChars: BLACKSTAR_ASTRA_CONTEXT_COMPACT_AT_CHARS,
    targetChars: BLACKSTAR_ASTRA_CONTEXT_TARGET_CHARS,
    preserveRecentToolRounds: BLACKSTAR_ASTRA_CONTEXT_PRESERVE_RECENT_TOOL_ROUNDS,
  }
}
