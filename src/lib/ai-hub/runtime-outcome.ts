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

/**
 * A returned success object alone cannot certify persistence. In particular,
 * Workforce may return a fallback {id, status} if its final SELECT is missing.
 * Confirm the exact owned task/run in the canonical table before the outer
 * approval gateway persists a recorded-success receipt.
 */
export async function confirmPersistedAiHubRuntimeOutcome(args: {
  sb: { from: (table: string) => any }
  userId: string
  resourceId: string
  kind: 'agent' | 'workflow'
  runtime: unknown
}): Promise<AiHubRuntimeOutcome> {
  const outcome = args.kind === 'agent'
    ? agentGatewayOutcome(args.runtime)
    : workflowGatewayOutcome(args.runtime)
  // A pause or failure is already non-terminal; do not claim success or
  // start a new lookup that could mask the actionable underlying status.
  if (outcome.status !== 'completed') return outcome

  const key = args.kind === 'agent' ? 'task' : 'run'
  const nested = args.runtime && typeof args.runtime === 'object' && !Array.isArray(args.runtime)
    ? (args.runtime as Record<string, unknown>)[key] : null
  const record = nested && typeof nested === 'object' && !Array.isArray(nested)
    ? nested as Record<string, unknown> : null
  const id = record?.['id']
  if (typeof id !== 'string' || !id || !args.userId || !args.resourceId) {
    return { status: 'failed', error: 'AI Hub cannot verify the owned runtime completion record.' }
  }
  const table = args.kind === 'agent' ? 'agent_tasks' : 'workflow_runs'
  const resourceKey = args.kind === 'agent' ? 'agent_id' : 'workflow_id'
  try {
    const { data, error } = await args.sb.from(table)
      .select('id,status')
      .eq('id', id)
      .eq('user_id', args.userId)
      .eq(resourceKey, args.resourceId)
      .maybeSingle()
    if (error || data?.id !== id || data?.status !== 'succeeded') {
      return { status: 'failed', error: 'AI Hub could not confirm a persisted succeeded run for this owned resource.' }
    }
  } catch {
    return { status: 'failed', error: 'AI Hub could not verify the canonical runtime record.' }
  }
  return outcome
}
