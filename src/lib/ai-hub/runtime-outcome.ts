/**
 * Translate the existing Agent Task / Workforce persisted run state into the
 * AI Hub gateway's outcome. Returning from a runtime function is not proof
 * that its work completed: an agent may be waiting for tool approval, and a
 * workflow may have paused or failed without throwing.
 *
 * "failed" here describes the *AI Hub gateway attempt*, not a cancellation
 * of the underlying task. The underlying workforce approval/resume state
 * remains authoritative in its own existing system.
 */
export type AiHubRuntimeOutcome =
  | { status: 'completed' }
  | { status: 'failed'; error: string }

function storedStatus(result: unknown, key: 'task' | 'run'): string | null {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return null
  const record = (result as Record<string, unknown>)[key]
  if (!record || typeof record !== 'object' || Array.isArray(record)) return null
  const status = (record as Record<string, unknown>)['status']
  return typeof status === 'string' ? status : null
}

export function agentGatewayOutcome(result: unknown): AiHubRuntimeOutcome {
  const status = storedStatus(result, 'task')
  if (status === 'succeeded') return { status: 'completed' }
  if (status === 'waiting_for_approval' || status === 'awaiting_approval') {
    return {
      status: 'failed',
      error: 'The agent task is waiting for separate tool approval. Continue it in Agent Tasks; this AI Hub gateway attempt has not completed.',
    }
  }
  return {
    status: 'failed',
    error: 'The agent task did not reach a persisted succeeded state. Check Agent Tasks for its actual status and evidence.',
  }
}

export function workflowGatewayOutcome(result: unknown): AiHubRuntimeOutcome {
  const status = storedStatus(result, 'run')
  if (status === 'succeeded') return { status: 'completed' }
  if (status === 'waiting_for_approval' || status === 'awaiting_approval') {
    return {
      status: 'failed',
      error: 'The workflow is waiting for separate step approval. Continue it in Workforce; this AI Hub gateway attempt has not completed.',
    }
  }
  return {
    status: 'failed',
    error: 'The workflow did not reach a persisted succeeded state. Check Workforce for its actual status and evidence.',
  }
}
