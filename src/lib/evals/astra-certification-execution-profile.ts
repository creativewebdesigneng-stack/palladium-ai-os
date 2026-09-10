import { createHash } from 'node:crypto'
import type { NativeIntelligenceTaskClass } from '@/lib/ai/native-intelligence-model-platform'

export const ASTRA_CERTIFICATION_PROVENANCE_VERSION = 5 as const

export type AstraCertificationExecutionProfile = {
  id: string
  maxTokens: number
  timeoutMs: number
  reasoningMode: 'provider_default' | 'disabled' | 'low'
  reasoningEffort: 'none' | 'low' | null
  maxAttempts: 1 | 3
  promptSuffix: string | null
  fallback: false
}

const DEFAULT_PINNED_PROFILE: AstraCertificationExecutionProfile = {
  id: 'blackstar-astra-pinned-default-v1',
  maxTokens: 1600,
  timeoutMs: 90_000,
  reasoningMode: 'provider_default',
  reasoningEffort: null,
  maxAttempts: 3,
  promptSuffix: null,
  fallback: false,
}

const BOUNDED_QWEN3_PROFILE: AstraCertificationExecutionProfile = {
  id: 'blackstar-astra-native-qwen3-bounded-v3',
  maxTokens: 512,
  timeoutMs: 60_000,
  reasoningMode: 'disabled',
  reasoningEffort: 'none',
  maxAttempts: 1,
  promptSuffix: '/no_think',
  fallback: false,
}

const BOUNDED_GPT_OSS_20B_PROFILE: AstraCertificationExecutionProfile = {
  id: 'blackstar-astra-native-gptoss20b-bounded-v2',
  maxTokens: 512,
  timeoutMs: 60_000,
  reasoningMode: 'low',
  reasoningEffort: 'low',
  maxAttempts: 1,
  promptSuffix: null,
  fallback: false,
}

function isQwen3Model(model: string): boolean {
  return /(?:^|[\/:._-])qwen3(?:[\/:._-]|$)/i.test(model.trim())
}

function isGptOss20bModel(model: string): boolean {
  return /(?:^|[\/:._-])gpt-oss-20b(?:[\/:._-]|$)/i.test(model.trim())
}

export function resolveAstraCertificationExecutionProfile(
  taskClass: NativeIntelligenceTaskClass,
  model: string,
): AstraCertificationExecutionProfile {
  if (taskClass !== 'vision' && isQwen3Model(model)) return { ...BOUNDED_QWEN3_PROFILE }
  if (taskClass !== 'vision' && isGptOss20bModel(model)) return { ...BOUNDED_GPT_OSS_20B_PROFILE }
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
    && profile['reasoningEffort'] === expected.reasoningEffort
    && profile['maxAttempts'] === expected.maxAttempts
    && profile['promptSuffix'] === expected.promptSuffix
    && profile['fallback'] === false
}
