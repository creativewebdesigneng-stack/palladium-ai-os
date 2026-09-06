import { EntitlementError } from '@/lib/platform/entitlements.server'
import { captureVerifiedAgentExperience } from './agent-learning.server'
import { loadVerifiedExperienceMetacognition, renderMetacognitionControl } from './general-intelligence-metacognition.server'
import { composeGeneralIntelligencePlanningSystemPrompt } from './general-intelligence-planning-context'
import { buildRuntimeIntelligenceControl } from './general-intelligence-runtime'
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
    const [intelligence, metacognition] = await Promise.all([
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
    ])
    const metacognitionControl = renderMetacognitionControl(metacognition)
    const baseSystemMessage = run.messages[0] ?? { role: 'system' as const, content: '' }
    run = {
      ...run,
      messages: [
        {
          role: 'system',
          content: composeGeneralIntelligencePlanningSystemPrompt({
            baseSystemPrompt: baseSystemMessage.content,
            intelligenceControl: intelligence.prompt,
            metacognitionControl,
          }),
        },
        ...run.messages.slice(1),
      ],
    }
    let task = await executePlannedRun({ sb: args.sb, userId: args.userId, run })
    if (!outputText(task)) {
      run = {
        ...run,
        messages: [...run.messages, {
          role: 'system',
          content: 'DELIVERABLE RECOVERY REQUIRED. Complete the original task now and return a concrete non-empty deliverable. Use enabled read-only tools when evidence is needed. Do not finish with an empty response.',
        }],
      }
      task = await executePlannedRun({ sb: args.sb, userId: args.userId, run })
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
