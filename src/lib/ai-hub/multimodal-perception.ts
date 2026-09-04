export type BlackstarPerceptionModality = 'text' | 'image' | 'audio' | 'video' | 'sensor'
export type BlackstarPerceptionSensitivity = 'public' | 'internal' | 'confidential' | 'restricted'

export interface BlackstarPerceptionInput {
  id: string
  modality: BlackstarPerceptionModality
  source: string
  sensitivity?: BlackstarPerceptionSensitivity
  durationSeconds?: number
  sizeBytes?: number
}

export interface BlackstarPerceptionPolicy {
  allowedModalities?: BlackstarPerceptionModality[]
  maximumInputs?: number
  maximumDurationSeconds?: number
  maximumSizeBytes?: number
  allowRestricted?: boolean
  requireApprovalForRestricted?: boolean
}

export interface BlackstarPerceptionDecision {
  input: BlackstarPerceptionInput
  allowed: boolean
  requiresApproval: boolean
  reason: string
}

export interface BlackstarPerceptionPlan {
  decisions: BlackstarPerceptionDecision[]
  executable: boolean
  requiresApproval: boolean
  blockedCount: number
}

const DEFAULT_MODALITIES: BlackstarPerceptionModality[] = ['text', 'image', 'audio', 'video']

export function buildBlackstarPerceptionPlan(
  inputs: BlackstarPerceptionInput[],
  policy: BlackstarPerceptionPolicy = {},
): BlackstarPerceptionPlan {
  const allowedModalities = new Set(policy.allowedModalities ?? DEFAULT_MODALITIES)
  const maximumInputs = Math.max(1, Math.min(100, Math.floor(policy.maximumInputs ?? 20)))
  const maximumDurationSeconds = Math.max(1, policy.maximumDurationSeconds ?? 3600)
  const maximumSizeBytes = Math.max(1, policy.maximumSizeBytes ?? 100 * 1024 * 1024)
  const allowRestricted = policy.allowRestricted ?? false
  const requireRestrictedApproval = policy.requireApprovalForRestricted ?? true

  const decisions = inputs.slice(0, maximumInputs).map((input): BlackstarPerceptionDecision => {
    if (!allowedModalities.has(input.modality)) {
      return { input, allowed: false, requiresApproval: false, reason: 'Input modality is disabled by policy.' }
    }
    if ((input.durationSeconds ?? 0) > maximumDurationSeconds) {
      return { input, allowed: false, requiresApproval: false, reason: 'Input duration exceeds the governed perception ceiling.' }
    }
    if ((input.sizeBytes ?? 0) > maximumSizeBytes) {
      return { input, allowed: false, requiresApproval: false, reason: 'Input size exceeds the governed perception ceiling.' }
    }

    const sensitivity = input.sensitivity ?? 'internal'
    if (sensitivity === 'restricted' && !allowRestricted) {
      return { input, allowed: false, requiresApproval: false, reason: 'Restricted perception input is disabled by policy.' }
    }
    if (sensitivity === 'restricted' && requireRestrictedApproval) {
      return { input, allowed: true, requiresApproval: true, reason: 'Restricted input requires explicit approval before perception.' }
    }

    return { input, allowed: true, requiresApproval: false, reason: 'Input is allowed within the governed multimodal perception policy.' }
  })

  const blockedCount = decisions.filter((decision) => !decision.allowed).length
  return {
    decisions,
    executable: decisions.length > 0 && blockedCount === 0,
    requiresApproval: decisions.some((decision) => decision.requiresApproval),
    blockedCount,
  }
}
