import type { AiHubLiveResource, AiHubResourceRecord } from './resources'

export interface AiHubModelEvalSummary {
  provider: string
  model: string
  evaluationCount: number
  scoreTotal: number
  lastEvaluatedAt: string | null
}

export function aggregateAiHubModelEvalTrust(
  responses: readonly AiHubResourceRecord[],
  scores: readonly AiHubResourceRecord[],
) {
  const responseById = new Map<string, { provider: string; model: string }>()
  for (const row of responses) {
    const id = String(row['id'] ?? '')
    const provider = String(row['provider'] ?? '')
    const model = String(row['model'] ?? '')
    if (id && provider && model) responseById.set(id, { provider, model })
  }

  const byModel = new Map<string, AiHubModelEvalSummary>()
  for (const row of scores) {
    const responseId = String(row['response_id'] ?? '')
    const response = responseById.get(responseId)
    if (!response) continue
    const rawScore = Number(row['score'])
    if (!Number.isFinite(rawScore)) continue
    const score = Math.min(Math.max(rawScore, 0), 100)
    const key = `${response.provider}:${response.model}`
    const current = byModel.get(key) ?? {
      provider: response.provider,
      model: response.model,
      evaluationCount: 0,
      scoreTotal: 0,
      lastEvaluatedAt: null,
    }
    current.evaluationCount += 1
    current.scoreTotal += score
    if (!current.lastEvaluatedAt && row['created_at']) current.lastEvaluatedAt = String(row['created_at'])
    byModel.set(key, current)
  }
  return byModel
}

export function withAiHubModelEvalTrust(
  resource: AiHubLiveResource,
  summary?: AiHubModelEvalSummary,
): AiHubLiveResource {
  if (!summary || summary.evaluationCount === 0) return resource
  const average = summary.scoreTotal / summary.evaluationCount
  return {
    ...resource,
    metadata: {
      ...resource.metadata,
      evalCount: String(summary.evaluationCount),
      evalAverageScore: average.toFixed(1),
      ...(summary.lastEvaluatedAt ? { lastEvaluatedAt: summary.lastEvaluatedAt } : {}),
    },
  }
}
