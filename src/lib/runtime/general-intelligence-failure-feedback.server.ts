import { analyseAgentImprovement, type AgentImprovementTask } from '@/lib/agents/agent-improvement'

type Sb = { from: (table: string) => any }

export type GeneralIntelligenceFailureFeedback = {
  version: 1
  recent_runs: number
  failed_runs: number
  high_replan_runs: number
  recurring_patterns: Array<{
    kind: 'verification' | 'tool' | 'timeout' | 'replan' | 'model' | 'execution'
    count: number
  }>
}

const EMPTY: GeneralIntelligenceFailureFeedback = {
  version: 1,
  recent_runs: 0,
  failed_runs: 0,
  high_replan_runs: 0,
  recurring_patterns: [],
}

/**
 * Loads bounded recent terminal evidence for one already-authorised agent and
 * reduces it to aggregate failure categories only. Raw task inputs, outputs,
 * errors, verifier issue text, permissions and tool payloads are never returned
 * to the planner.
 */
export async function loadGeneralIntelligenceFailureFeedback(args: {
  sb: Sb
  agentId: string
  limit?: number
}): Promise<GeneralIntelligenceFailureFeedback> {
  const limit = Math.min(Math.max(args.limit ?? 30, 5), 50)
  const { data, error } = await args.sb
    .from('agent_tasks')
    .select('agent_id,status,error,replan_count,verification_state,provider,model,duration_ms,created_at')
    .eq('agent_id', args.agentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !Array.isArray(data) || data.length === 0) return EMPTY

  const report = analyseAgentImprovement(data as AgentImprovementTask[])
  return {
    version: 1,
    recent_runs: report.runs,
    failed_runs: report.failed_runs,
    high_replan_runs: report.high_replan_runs,
    recurring_patterns: report.patterns
      .filter((pattern) => pattern.count >= 2)
      .map((pattern) => ({ kind: pattern.kind, count: pattern.count }))
      .slice(0, 6),
  }
}

export function renderGeneralIntelligenceFailureFeedback(
  feedback: GeneralIntelligenceFailureFeedback,
): string {
  if (feedback.recent_runs === 0 || feedback.recurring_patterns.length === 0) return ''

  const patterns = feedback.recurring_patterns
    .map((pattern) => `${pattern.kind}:${pattern.count}`)
    .join(' | ')

  return [
    'BLACKSTAR VERIFIED FAILURE FEEDBACK',
    `Recent terminal runs assessed: ${feedback.recent_runs}.`,
    `Recent failed/cancelled runs: ${feedback.failed_runs}.`,
    `Runs requiring repeated re-planning: ${feedback.high_replan_runs}.`,
    `Recurring bounded failure categories: ${patterns}.`,
    'Treat these aggregate categories as advisory planning cautions only. Do not infer the cause, reproduce prior error text, alter permissions, grant tools, bypass approvals, change providers, or assume the current task will fail.',
    'Use them only to strengthen checks, success criteria, sequencing, and independent verification for the current objective.',
  ].join('\n')
}
