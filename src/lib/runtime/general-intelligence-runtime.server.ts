import {
  assessGeneralIntelligenceGoal,
  normaliseGeneralIntelligenceGoal,
  renderGeneralIntelligenceControlPrompt,
  type GeneralIntelligenceAssessment,
} from '@/lib/agents/general-intelligence-kernel'
import type { OrchestratorCandidate } from '@/lib/agents/agent-orchestrator'
import type { PreparedRun } from './runtime.server'

type Sb = { from: (table: string) => any }

type RuntimeGeneralIntelligenceResult = {
  run: PreparedRun
  assessment: GeneralIntelligenceAssessment
}

function currentAgentCandidate(run: PreparedRun): OrchestratorCandidate {
  return {
    id: run.agent.id,
    name: run.agent.name,
    category: run.agent.category,
    purpose: run.agent.purpose,
    allowed_tools: run.agent.allowed_tools,
    model_provider: run.agent.model_provider,
    model: run.agent.model,
  }
}

async function loadAuthorisedCandidates(sb: Sb, run: PreparedRun): Promise<OrchestratorCandidate[]> {
  try {
    const { data, error } = await sb
      .from('personal_agents')
      .select('id,name,category,purpose,allowed_tools,model_provider,model,status')
      .neq('status', 'archived')
      .limit(50)

    if (error) throw error

    const candidates = (Array.isArray(data) ? data : [])
      .filter((row) => row && typeof row === 'object' && typeof row.id === 'string' && typeof row.name === 'string')
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        category: typeof row.category === 'string' ? row.category : null,
        purpose: typeof row.purpose === 'string' ? row.purpose : null,
        allowed_tools: Array.isArray(row.allowed_tools) ? row.allowed_tools.map(String) : null,
        model_provider: typeof row.model_provider === 'string' ? row.model_provider : null,
        model: typeof row.model === 'string' ? row.model : null,
      })) satisfies OrchestratorCandidate[]

    if (!candidates.some((candidate) => candidate.id === run.agent.id)) {
      candidates.unshift(currentAgentCandidate(run))
    }
    return candidates.length ? candidates : [currentAgentCandidate(run)]
  } catch (error) {
    console.error('[runtime.general-intelligence] candidate discovery failed', error)
    return [currentAgentCandidate(run)]
  }
}

function forceApproval(run: PreparedRun): boolean {
  const autonomy = String(run.agent.autonomy ?? '').trim().toLowerCase()
  return run.agent.requires_approval === true || autonomy === 'approval_required' || autonomy === 'supervised'
}

/**
 * Applies the bounded General Intelligence Kernel to an authenticated prepared run.
 * Candidate discovery uses the caller's existing RLS-scoped Supabase client, so the
 * kernel can reason only over agents the operator is already authorised to see.
 */
export async function applyGeneralIntelligenceControl(args: {
  sb: Sb
  run: PreparedRun
  input: string
}): Promise<RuntimeGeneralIntelligenceResult> {
  const candidates = await loadAuthorisedCandidates(args.sb, args.run)
  const goal = normaliseGeneralIntelligenceGoal({ objective: args.input })
  const assessment = assessGeneralIntelligenceGoal({
    goal,
    candidates,
    forceApproval: forceApproval(args.run),
    maxAgents: 4,
  })

  const control = [
    renderGeneralIntelligenceControlPrompt(assessment),
    `Runtime binding: this execution remains bound to agent ${args.run.agent.id} (${args.run.agent.name}). Other selected agents are capability candidates only until Blackstar's orchestrator explicitly delegates work to them.`,
    'Runtime rule: do not impersonate, invoke, or claim work from another agent unless an authorised orchestration path actually delegates that work.',
  ].join('\n')

  const [first, ...rest] = args.run.messages
  const controlMessage = { role: 'system' as const, content: control }
  const messages = first?.role === 'system'
    ? [first, controlMessage, ...rest]
    : [controlMessage, ...args.run.messages]

  return {
    assessment,
    run: {
      ...args.run,
      messages,
    },
  }
}
