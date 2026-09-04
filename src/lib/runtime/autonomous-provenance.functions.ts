import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  appendProvenanceEvent,
  traceProvenance,
  verifyProvenanceChain,
  type ProvenanceEvent,
} from '@/lib/ai-hub/provenance'

type Sb = { from: (table: string) => any }

export interface AutonomousRunAuditEvent {
  id: string
  user_id: string
  event_type: string
  severity: string | null
  message: string
  payload: Record<string, unknown> | null
  created_at: string
}

function stableEvidence(payload: Record<string, unknown> | null | undefined): string[] {
  if (!payload || Object.keys(payload).length === 0) return []
  return [JSON.stringify(payload, Object.keys(payload).sort())]
}

export function buildAutonomousRunProvenance(events: AutonomousRunAuditEvent[]): ProvenanceEvent[] {
  const ordered = [...events].sort((left, right) => {
    const byTime = Date.parse(left.created_at) - Date.parse(right.created_at)
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime
  })

  let chain: ProvenanceEvent[] = []
  for (const [index, audit] of ordered.entries()) {
    const parent = index > 0 ? ordered[index - 1]?.id : undefined
    chain = appendProvenanceEvent(chain, {
      id: audit.id,
      actorId: audit.user_id,
      actorType: 'system',
      action: audit.event_type,
      reason: audit.message,
      timestamp: audit.created_at,
      ...(parent ? { parentIds: [parent] } : {}),
      evidence: [
        `severity:${audit.severity ?? 'info'}`,
        ...stableEvidence(audit.payload),
      ],
    })
  }
  return chain
}

const provenanceInput = z.object({
  run_id: z.string().uuid(),
  event_id: z.string().uuid().optional(),
})

export const getAutonomousRunProvenance = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => provenanceInput.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb

    const { data: run, error: runError } = await sb
      .from('autonomous_goal_runs')
      .select('id,goal_id,user_id,status,workflow_run_id,created_at,completed_at')
      .eq('id', data.run_id)
      .eq('user_id', context.userId)
      .maybeSingle()
    if (runError || !run) throw new Error(runError?.message ?? 'Autonomous run not found.')

    const { data: events, error: eventsError } = await sb
      .from('autonomous_goal_events')
      .select('id,user_id,event_type,severity,message,payload,created_at')
      .eq('run_id', data.run_id)
      .eq('user_id', context.userId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
    if (eventsError) throw new Error(eventsError.message)

    const chain = buildAutonomousRunProvenance((events ?? []) as AutonomousRunAuditEvent[])
    const verification = verifyProvenanceChain(chain)
    const targetEventId = data.event_id ?? chain.at(-1)?.id
    const trace = targetEventId ? traceProvenance(chain, targetEventId) : []

    return {
      run: {
        id: String(run.id),
        goal_id: String(run.goal_id),
        status: String(run.status),
        workflow_run_id: run.workflow_run_id ? String(run.workflow_run_id) : null,
        created_at: String(run.created_at),
        completed_at: run.completed_at ? String(run.completed_at) : null,
      },
      chain,
      verification,
      trace,
    }
  })
