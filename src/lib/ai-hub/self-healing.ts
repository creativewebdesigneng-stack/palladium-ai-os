export type FailureClass = 'transient' | 'dependency' | 'policy' | 'data' | 'unknown'
export type RecoveryAction = 'retry' | 'reroute' | 'rollback' | 'pause_for_approval' | 'fail_closed'

export interface RuntimeFailure {
  id: string
  failureClass: FailureClass
  attempt: number
  providerAlternatives?: number
  checkpointAvailable?: boolean
  mutationOccurred?: boolean
}

export interface HealingPolicy {
  maxRetries?: number
  allowReroute?: boolean
  allowRollback?: boolean
  requireApprovalAfterMutation?: boolean
}

export interface HealingDecision {
  action: RecoveryAction
  automatic: boolean
  reason: string
}

export function decideRecovery(
  failure: RuntimeFailure,
  policy: HealingPolicy = {},
): HealingDecision {
  const maxRetries = policy.maxRetries ?? 2
  const allowReroute = policy.allowReroute ?? true
  const allowRollback = policy.allowRollback ?? true
  const requireApprovalAfterMutation = policy.requireApprovalAfterMutation ?? true

  if (failure.failureClass === 'policy') {
    return { action: 'fail_closed', automatic: false, reason: 'policy_failures_cannot_self_heal' }
  }

  if (failure.mutationOccurred && requireApprovalAfterMutation) {
    if (allowRollback && failure.checkpointAvailable) {
      return { action: 'rollback', automatic: true, reason: 'rollback_to_safe_checkpoint' }
    }
    return { action: 'pause_for_approval', automatic: false, reason: 'mutation_requires_human_review' }
  }

  if (failure.failureClass === 'transient' && failure.attempt < maxRetries) {
    return { action: 'retry', automatic: true, reason: 'bounded_transient_retry' }
  }

  if (allowReroute && (failure.providerAlternatives ?? 0) > 0 && failure.failureClass === 'dependency') {
    return { action: 'reroute', automatic: true, reason: 'healthy_alternative_provider_available' }
  }

  if (allowRollback && failure.checkpointAvailable) {
    return { action: 'rollback', automatic: true, reason: 'restore_safe_checkpoint' }
  }

  return { action: 'fail_closed', automatic: false, reason: 'no_safe_recovery_path' }
}
