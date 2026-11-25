import { randomUUID } from 'node:crypto'
import { loadAstraXMemoryPrompt } from './astra-x-memory.server'
import { createServerFn } from '@tanstack/react-start'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'
import {
  AiHubExecutionGateway,
  createPalladiumAiHubRegistry,
  type AiHubOrchestrationPlan,
} from '@/lib/ai-hub'
import {
  getAstraXRuntimeConfiguration,
  runAstraXNativeChat,
  type AstraXMessage,
  type AstraXNativeChatRequest,
} from './astra-x-runtime.server'

type AstraXInput = AstraXNativeChatRequest

function validateAstraXInput(input: unknown): AstraXInput {
  const row = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const rawMessages = row['messages']
  if (!Array.isArray(rawMessages) || rawMessages.length < 1 || rawMessages.length > 64) {
    throw new Error('Astra X requires between 1 and 64 messages.')
  }

  const messages: AstraXMessage[] = rawMessages.map((raw) => {
    const message = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    const role = message['role']
    const content = message['content']
    if (role !== 'user' || typeof content !== 'string' || !content.trim() || content.length > 24_000) {
      throw new Error('Astra X client requests accept user messages only, with bounded text.')
    }
    return { role: 'user', content }
  })

  if (!messages.some((message) => message.role === 'user')) {
    throw new Error('Astra X requires at least one user message.')
  }
  if (messages.reduce((total, message) => total + message.content.length, 0) > 96_000) {
    throw new Error('Astra X request exceeds the configured input limit.')
  }

  const maxTokens = Number(row['maxTokens'] ?? 512)
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 4096) {
    throw new Error('Astra X maxTokens must be an integer between 1 and 4096.')
  }
  const timeoutMs = Number(row['timeoutMs'] ?? 45_000)
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new Error('Astra X timeoutMs must be between 1000 and 120000.')
  }

  return { messages, maxTokens, timeoutMs }
}

function createAstraXPlan(taskId: string, model: string): AiHubOrchestrationPlan {
  const capabilityId = 'astra-x-native-text'
  return {
    workloadId: taskId,
    discovery: [],
    requiresApproval: false,
    executionBoundary: 'palladium-policy-gateway',
    placement: {
      workloadId: taskId,
      capabilityId,
      deploymentTarget: 'palladium-cloud',
      privateExecution: false,
      reason: 'Astra X text inference uses the authenticated Blackstar server gateway and configured native endpoint.',
      policyChecks: ['tenant-isolation', 'capability-match', 'pinned-provider', 'no-tool-execution'],
    },
    route: {
      workloadId: taskId,
      capability: {
        id: capabilityId,
        kind: 'model',
        providerId: 'palladium-model-gateway',
        name: `Astra X · ${model}`,
        capabilities: ['text-inference', 'reasoning'],
        deploymentTargets: ['palladium-cloud'],
        metadata: { configured: true, model, routing: 'pinned-compatible-provider' },
      },
      reason: 'Astra X is pinned to the configured Blackstar-compatible model; cross-provider failover and tool calls are disabled.',
      policyChecks: ['tenant-isolation', 'native-provider-pinned', 'zero-fallback', 'tools-disabled'],
    },
  }
}

/**
 * Reports configuration state only. "configured" does not mean reachable or
 * verified, and the endpoint hostname/bearer key are never returned.
 */
export const getAstraXStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    if (!['1', 'true', 'yes', 'on'].includes((process.env['ASTRA_X_ENABLED'] ?? '').trim().toLowerCase())) {
      return { state: 'disabled' as const, model: null, endpointIsLoopback: null }
    }
    try {
      const runtime = getAstraXRuntimeConfiguration()
      if (!runtime) return { state: 'needs_configuration' as const, model: null, endpointIsLoopback: null }
      return {
        state: 'configured_unverified' as const,
        model: runtime.model,
        endpointIsLoopback: runtime.endpointIsLoopback,
      }
    } catch {
      return { state: 'invalid_configuration' as const, model: null, endpointIsLoopback: null }
    }
  })

/**
 * Authenticated, feature-flagged Astra X text entry point.
 * The AI Hub execution gateway remains the policy boundary; the adapter calls
 * only the pinned compatible model and never executes model-proposed tools.
 */
export const runAstraXTask = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateAstraXInput)
  .handler(async ({ data, context }) => {
    if (!['1', 'true', 'yes', 'on'].includes((process.env['ASTRA_X_ENABLED'] ?? '').trim().toLowerCase())) {
      throw new Error('Astra X is not enabled for this deployment.')
    }

    const runtime = getAstraXRuntimeConfiguration()
    if (!runtime) throw new Error('Astra X native runtime is not configured.')

    const taskId = `astra-x:${randomUUID()}`
    const memoryPrompt = await loadAstraXMemoryPrompt({
      sb: context.supabase as Parameters<typeof loadAstraXMemoryPrompt>[0]['sb'],
      userId: context.userId,
      query: data.messages[data.messages.length - 1]?.content ?? '',
    })
    const plan = createAstraXPlan(taskId, runtime.model)
    const registry = createPalladiumAiHubRegistry()
    registry.registerCapability(plan.route.capability)
    const gateway = new AiHubExecutionGateway(registry)

    gateway.registerAdapter('model-gateway', async (_plan, executionContext) => {
      const request = executionContext.input as AstraXNativeChatRequest
      const response = await runAstraXNativeChat({
        ...request,
        messages: [
          {
            role: 'system',
            content: [
              'You are Astra X, Blackstar’s local-first AI assistant. Answer clearly and accurately. Do not claim tool use, external access, or actions you have not performed. You have no tool permissions in this session.',
              memoryPrompt,
            ].filter(Boolean).join('\n\n'),
          },
          ...request.messages,
        ],
      })
      return {
        status: 'completed',
        adapter: 'model-gateway',
        output: {
          text: response.text,
          provider: response.provider,
          model: response.model,
          usage: response.usage,
        },
      }
    })

    const result = await gateway.execute(plan, {
      tenantId: context.userId,
      actorId: context.userId,
      input: data,
    })

    if (result.status !== 'completed' || !result.output || typeof result.output !== 'object') {
      throw new Error(result.error ?? 'Astra X task did not complete.')
    }
    const output = result.output as Record<string, unknown>
    const usage = output['usage'] as Record<string, unknown> | undefined
    if (typeof output['text'] !== 'string' || output['provider'] !== 'compatible' ||
        typeof output['model'] !== 'string' ||
        typeof usage?.['input'] !== 'number' || typeof usage?.['output'] !== 'number') {
      throw new Error('Astra X gateway returned an invalid response envelope.')
    }
    return {
      text: output['text'],
      provider: 'compatible' as const,
      model: output['model'],
      usage: { input: usage['input'], output: usage['output'] },
    }
  })
