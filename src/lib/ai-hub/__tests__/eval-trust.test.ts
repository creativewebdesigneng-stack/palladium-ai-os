import { describe, expect, it } from 'vitest'
import { aggregateAiHubModelEvalTrust, withAiHubModelEvalTrust } from '../eval-trust'
import type { AiHubLiveResource } from '../resources'

describe('AI Hub model evaluation trust signals', () => {
  it('aggregates safe scores by provider/model and ignores private evaluation content', () => {
    const responses = [
      { id: 'response-1', provider: 'openai', model: 'gpt-5-mini', created_at: '2026-09-01T20:00:00Z', response_text: 'private response' },
      { id: 'response-2', provider: 'openai', model: 'gpt-5-mini', created_at: '2026-09-01T19:00:00Z', response_text: 'another private response' },
    ]
    const scores = [
      { response_id: 'response-1', score: 90, created_at: '2026-09-01T20:01:00Z', reasoning: 'private reasoning' },
      { response_id: 'response-2', score: 70, created_at: '2026-09-01T19:01:00Z', reasoning: 'private reasoning 2' },
    ]

    const summary = aggregateAiHubModelEvalTrust(responses, scores).get('openai:gpt-5-mini')
    expect(summary).toEqual({
      provider: 'openai',
      model: 'gpt-5-mini',
      evaluationCount: 2,
      scoreTotal: 160,
      lastEvaluatedAt: '2026-09-01T20:01:00Z',
    })

    const resource: AiHubLiveResource = {
      id: 'openai:gpt-5-mini',
      kind: 'model',
      name: 'OpenAI · gpt-5-mini',
      status: 'available',
      providerId: 'palladium-model-gateway',
      capabilities: ['model-inference'],
      metadata: { modelProvider: 'openai', model: 'gpt-5-mini' },
    }
    const enriched = withAiHubModelEvalTrust(resource, summary)
    expect(enriched.metadata).toMatchObject({
      evalCount: '2',
      evalAverageScore: '80.0',
      lastEvaluatedAt: '2026-09-01T20:01:00Z',
    })

    const serialized = JSON.stringify(enriched)
    expect(serialized).not.toContain('private response')
    expect(serialized).not.toContain('private reasoning')
  })
})
