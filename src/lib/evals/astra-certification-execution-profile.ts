import { createHash } from 'node:crypto'
import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'

export const ASTRA_CERTIFICATION_PROVENANCE_VERSION = 4 as const

export type AstraCertificationExecutionProfile = {
  id: string
  maxTokens: number
  timeoutMs: number
  reasoningMode: 'provider_default' | 'disabled'
  promptSuffix: string | null
  fallback: false
}

const DEFAULT_PINNED_PROFILE: AstraCertificationExecutionProfile = {
  id: 'blackstar-astra-pinned-default-v1',
  maxTokens: 1600,
  timeoutMs: 90_000,
  reasoningMode: 'provider_default',
  promptSuffix: null,
  fallback: false,
}

const BOUNDED_QWEN3_PROFILE: AstraCertificationExecutionProfile = {
  id: 'blackstar-astra-native-qwen3-bounded-v1',
  maxTokens: 512,
  timeoutMs: 60_000,
  reasoningMode: 'disabled',
  promptSuffix: '/no_think',
  fallback: false,
}

function isQwen3Model(model: string): boolean {
  return /(?:^|[\/:._-])qwen3(?:[\/:._-]|$)/i.test(model.trim())
}

export function resolveAstraCertificationExecutionProfile(
  taskClass: NativeIntelligenceTaskClass,
  model: string,
): AstraCertificationExecutionProfile {
  if (taskClass !== 'vision' && isQwen3Model(model)) return { ...BOUNDED_QWEN3_PROFILE }
  return { ...DEFAULT_PINNED_PROFILE }
}

export function buildAstraCertificationExecutionPrompt(
  canonicalPrompt: string,
  profile: AstraCertificationExecutionProfile,
): string {
  return profile.promptSuffix ? `${canonicalPrompt}\n\n${profile.promptSuffix}` : canonicalPrompt
}

export function hashAstraCertificationExecutionPrompt(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function sameAstraCertificationExecutionProfile(
  value: unknown,
  expected: AstraCertificationExecutionProfile,
): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const profile = value as Record<string, unknown>
  return profile['id'] === expected.id
    && profile['maxTokens'] === expected.maxTokens
    && profile['timeoutMs'] === expected.timeoutMs
    && profile['reasoningMode'] === expected.reasoningMode
    && profile['promptSuffix'] === expected.promptSuffix
    && profile['fallback'] === false
}
