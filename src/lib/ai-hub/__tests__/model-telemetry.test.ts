import { describe, expect, it } from 'vitest'
import { aggregateAiHubModelUsage, withAiHubModelUsage } from '../model-telemetry'
import type { AiHubLiveResource } from '../resources'

describe('AI Hub model telemetry', () => {
  it('aggregates only safe usage counters by provider and model', () => {
    const usage = aggregateAiHubModelUsage([
      { provider: 'openai', model: 'gpt-5-mini', status: 'succeeded', tokens_in: 10, tokens_out: 20, cost_pence: 3, created_at: '2026-09-01T21:00:00Z', prompt: 'private prompt' },
      { provider: 'openai', model: 'gpt-5-mini', status: 'failed', tokens_in: 4, tokens_out: 0, cost_pence: 1, created_at: '2026-09-01T20:00:00Z', error: 'private failure detail' },
    ])

    expect(usage.get('openai:gpt-5-mini')).toEqual({
      provider: 'openai',
      model: 'gpt-5-mini',
      runs: 2,
      succeeded: 1,
      failed: 1,
      tokensIn: 14,
      tokensOut: 20,
      costPence: 4,
      lastUsedAt: '2026-09-01T21:00:00Z',
    })
    expect(JSON.stringify(usage.get('openai:gpt-5-mini'))).not.toContain('private prompt')
    expect(JSON.stringify(usage.get('openai:gpt-5-mini'))).not.toContain('private failure detail')
  })

  it('adds usage metadata without changing model identity or capabilities', () => {
    const resource: AiHubLiveResource = {
      id: 'openai:gpt-5-mini',
      kind: 'model',
      name: 'OpenAI · gpt-5-mini',
      status: 'available',
      providerId: 'palladium-model-gateway',
      capabilities: ['model-inference'],
      metadata: { modelProvider: 'openai', model: 'gpt-5-mini', configured: 'true' },
    }

    expect(withAiHubModelUsage(resource, {
      provider: 'openai', model: 'gpt-5-mini', runs: 3, succeeded: 2, failed: 1,
      tokensIn: 120, tokensOut: 80, costPence: 9, lastUsedAt: '2026-09-01T21:00:00Z',
    })).toEqual({
      ...resource,
      metadata: {
        ...resource.metadata,
        recentRuns: '3',
        succeededRuns: '2',
        failedRuns: '1',
        tokensIn: '120',
        tokensOut: '80',
        costPence: '9',
        lastUsedAt: '2026-09-01T21:00:00Z',
      },
    })
  })
})
