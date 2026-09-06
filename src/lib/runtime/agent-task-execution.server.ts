import { EntitlementError } from '@/lib/platform/entitlements.server'
import { captureVerifiedAgentExperience } from './agent-learning.server'
import { BLACKSTAR_ASTRA_ENGINE_PROFILE } from './blackstar-astra-engine-profile'
import {
  renderBlackstarAstraReasoningControl,
  selectBlackstarAstraReasoningControl,
} from './blackstar-astra-reasoning'
import { isolateGeneralIntelligenceCurrentTaskContext } from './general-intelligence-context-isolation'
import { loadGeneralIntelligenceFailureFeedback, renderGeneralIntelligenceFailureFeedback } from './general-intelligence-failure-feedback.server'
import { loadVerifiedExperienceMetacognition, renderMetacognitionControl } from './general-intelligence-metacognition.server'
import { composeGeneralIntelligencePlanningSystemPrompt } from './general-intelligence-planning-context'
import { buildRuntimeIntelligenceControl } from './general-intelligence-runtime'
import {
  persistNativeIntelligenceRuntimeRouting,
  resolveNativeIntelligenceRuntimeRouting,
} from './native-intelligence-runtime-routing.server'
import { executePlannedRun } from './planner-runtime.server'
import { failRun, prepareRun, rescueRuntimeConnectedServiceRead, RuntimeError } from './runtime.server'

type Sb = { from: (table: string) => any }

function surface(error: unknown): never {
  if (error instanceof RuntimeError || error instanceof EntitlementError) throw error
  console.error('[runtime.agent-task]', error)
  throw new Error(error instanceof Error ? error.message : 'The agent runtime is unavailable.')
}

function outputText(task: unknown): string {
  if (!task || typeof task !== 'object') return ''
  const row = task as Record<string, unknown>
  const direct = typeof row['output_text'] === 'string' ? row['output_text'].trim() : ''
  if (direct) return direct
  const output = row['output']
  if (output && typeof output === 'object' && !Array.isArray(output)) {
    const text = (output as Record<string, unknown>)['text']
    if (typeof text === 'string') return text.trim()
  }
  return ''
}

/** Shared, authenticated agent execution path used by every first-party UI. */
export async function executeAgentTask(args: { sb: Sb; userId: string; agentId: string; input: string }) {
  let run: Awaited<ReturnType<typeof prepareRun>> | null = null
  try {
    run = await prepareRun({ sb: args.sb, userId: args.userId, agentId: args.agentId, input: args.input })
    run = {
      ...run,
      messages: isolateGeneralIntelligenceCurrentTaskContext({ messages: run.messages, input: args.input }),
    }
    const routing = await resolveNativeIntelligenceRuntimeRouting({
      sb: args.sb,
      userId: args.userId,
      run,
    })
    await persistNativeIntelligenceRuntimeRouting({
      sb: args.sb,
      taskId: run.taskId,
      routing,
    })
    run = {
      ...run,
      provider: routing.provider,
      model: routing.model,
    }
    const [intelligence, metacognition, failureFeedback] = await Promise.all([
      Promise.resolve(buildRuntimeIntelligenceControl({ agent: run.agent, input: args.input })),
      loadVerifiedExperienceMetacognition({
        sb: args.sb,
        userId: args.userId,
        orgId: run.orgId,
        agentId: run.agent.id,
        objective: args.input,
      }).catch((error) => {
        console.error('[runtime.metacognition] verified experience load failed', error)
        return { version: 1 as const, experience_count: 0, strengths: [], cautions: [], evidence: [] }
      }),
      loadGeneralIntelligenceFailureFeedback({
        sb: args.sb,
        agentId: run.agent.id,
      }).catch((error) => {
        console.error('[runtime.failure-feedback] recent failure pattern load failed', error)
        return {
          version: 1 as const,
          recent_runs: 0,
          failed_runs: 0,
          high_replan_runs: 0,
          recurring_patterns: [],
        }
      }),
    ])
    const reasoningControl = routing.decision?.model_id === BLACKSTAR_ASTRA_ENGINE_PROFILE.id
      ? selectBlackstarAstraReasoningControl(intelligence.assessment)
      : null
    const intelligenceControl = [
      intelligence.prompt,
      reasoningControl ? renderBlackstarAstraReasoningControl(reasoningControl) : '',
    ].filter(Boolean).join('\n\n')
    const metacognitionControl = [
      renderMetacognitionControl(metacognition),
      renderGeneralIntelligenceFailureFeedback(failureFeedback),
    ].filter(Boolean).join('\n\n')
    const baseSystemMessage = run.messages[0] ?? { role: 'system' as const, content: '' }
    run = {
      ...run,
      messages: [
        {
          role: 'system',
          content: composeGeneralIntelligencePlanningSystemPrompt({
            baseSystemPrompt: baseSystemMessage.content,
            intelligenceControl,
            metacognitionControl,
          }),
        },
        ...run.messages.slice(1),
      ],
    }
    let task = await executePlannedRun({ sb: args.sb, userId: args.userId, run, reasoningControl })
    if (!outputText(task)) {
      run = {
        ...run,
        messages: [...run.messages, {
          role: 'system',
          content: 'DELIVERABLE RECOVERY REQUIRED. Complete the original task now and return a concrete non-empty deliverable. Use enabled read-only tools when evidence is needed. Do not finish with an empty response.',
        }],
      }
      task = await executePlannedRun({ sb: args.sb, userId: args.userId, run, reasoningControl })
    }
    const output = outputText(task)
    if (!output) throw new RuntimeError('The agent could not produce a usable final deliverable. Please review its tools/model configuration and retry.', 'EMPTY_DELIVERABLE', 502)
    await captureVerifiedAgentExperience({ sb: args.sb as never, userId: args.userId, taskId: run.taskId })
    return { task, output }
  } catch (error) {
    if (run) {
      const rescued = await rescueRuntimeConnectedServiceRead({ sb: args.sb, userId: args.userId, run, error })
      if (rescued) return { task: rescued.task, output: rescued.result.text }
      await failRun({ userId: args.userId, run, error })
    }
    surface(error)
  }
}
