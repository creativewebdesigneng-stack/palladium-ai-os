import { describe, expect, it } from 'vitest'
import { aggregateAiHubModelUsage, withAiHubModelUsage } from '../model-telemetry'
import type { AiHubLiveResource } from '../resources'

describe('AI Hub model telemetry metadata contract', () => {
  it('attaches safe aggregated usage fields to a model resource', () => {
    const usage = aggregateAiHubModelUsage([
      { provider: 'openai', model: 'gpt-5-mini', status: 'completed', tokens_in: 120, tokens_out: 30, cost_pence: 4, created_at: '2026-09-01T20:00:00Z' },
      { provider: 'openai', model: 'gpt-5-mini', status: 'failed', tokens_in: 20, tokens_out: 0, cost_pence: 1, created_at: '2026-09-01T19:00:00Z', prompt: 'private-prompt', error: 'private-error' },
    ]).get('openai:gpt-5-mini')

    const resource: AiHubLiveResource = {
      id: 'openai:gpt-5-mini',
      kind: 'model',
      name: 'OpenAI · gpt-5-mini',
      status: 'available',
      providerId: 'palladium-model-gateway',
      capabilities: ['model-inference'],
      metadata: { modelProvider: 'openai', model: 'gpt-5-mini' },
    }

    const enriched = withAiHubModelUsage(resource, usage)
    expect(enriched.metadata).toMatchObject({
      recentRuns: '2',
      succeededRuns: '1',
      failedRuns: '1',
      tokensIn: '140',
      tokensOut: '30',
      costPence: '5',
      lastUsedAt: '2026-09-01T20:00:00Z',
    })

    const serialized = JSON.stringify(enriched)
    expect(serialized).not.toContain('private-prompt')
    expect(serialized).not.toContain('private-error')
  })
})
