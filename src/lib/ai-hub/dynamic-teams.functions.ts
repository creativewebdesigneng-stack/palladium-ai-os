import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import { formDynamicAgentTeam, type TeamAgentCandidate } from './dynamic-teams'

type Sb = { from: (table: string) => any }

type AgentRow = {
  id: string
  allowed_tools?: string[] | null
  operating_profile?: { skills?: string[] | null } | null
}

type TaskRow = { agent_id: string; status?: string | null }

const inputSchema = z.object({
  missionId: z.string().trim().min(1).max(120),
  requiredCapabilities: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  maxTeamSize: z.number().int().min(1).max(20).optional(),
  minTrustScore: z.number().min(0).max(1).optional(),
  maxActiveWorkloads: z.number().int().min(0).max(20).optional(),
})

export function buildDynamicTeamCandidates(agents: AgentRow[], tasks: TaskRow[]): TeamAgentCandidate[] {
  const byAgent = new Map<string, TaskRow[]>()
  for (const task of tasks) {
    const rows = byAgent.get(task.agent_id) ?? []
    rows.push(task)
    byAgent.set(task.agent_id, rows)
  }

  return agents.map((agent) => {
    const history = byAgent.get(agent.id) ?? []
    const completed = history.filter((task) => ['completed', 'succeeded'].includes(String(task.status))).length
    const failed = history.filter((task) => ['failed', 'cancelled'].includes(String(task.status))).length
    const finished = completed + failed
    const trustScore = finished > 0 ? completed / finished : 0.75
    const activeWorkloads = history.filter((task) => ['queued', 'running', 'waiting_for_approval'].includes(String(task.status))).length
    const capabilities = [...new Set([
      ...(agent.allowed_tools ?? []),
      ...(agent.operating_profile?.skills ?? []),
    ].map((value) => String(value).trim()).filter(Boolean))]

    return {
      agentId: agent.id,
      capabilities,
      trustScore,
      available: true,
      activeWorkloads,
    }
  })
}

export const planDynamicAgentTeam = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as unknown as Sb
    const { data: agents, error: agentError } = await sb
      .from('personal_agents')
      .select('id,allowed_tools,operating_profile')
      .eq('user_id', context.userId)
      .eq('status', 'active')
      .limit(100)
    if (agentError) throw new Error(agentError.message)

    const ids = (agents ?? []).map((agent: AgentRow) => agent.id)
    let tasks: TaskRow[] = []
    if (ids.length) {
      const result = await sb
        .from('agent_tasks')
        .select('agent_id,status')
        .in('agent_id', ids)
        .order('created_at', { ascending: false })
        .limit(1000)
      if (result.error) throw new Error(result.error.message)
      tasks = result.data ?? []
    }

    const plan = formDynamicAgentTeam(
      buildDynamicTeamCandidates((agents ?? []) as AgentRow[], tasks),
      {
        missionId: data.missionId,
        requiredCapabilities: data.requiredCapabilities,
        ...(data.maxTeamSize !== undefined ? { maxTeamSize: data.maxTeamSize } : {}),
        ...(data.minTrustScore !== undefined ? { minTrustScore: data.minTrustScore } : {}),
        ...(data.maxActiveWorkloads !== undefined ? { maxActiveWorkloads: data.maxActiveWorkloads } : {}),
      },
    )

    return plan
  })
