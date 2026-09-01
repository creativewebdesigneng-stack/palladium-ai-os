import type { AiHubLiveResource, AiHubResourceRecord } from './resources'

export interface AiHubModelUsageSummary {
  provider: string
  model: string
  runs: number
  succeeded: number
  failed: number
  tokensIn: number
  tokensOut: number
  costPence: number
  lastUsedAt: string | null
}

export function aggregateAiHubModelUsage(rows: readonly AiHubResourceRecord[]) {
  const byModel = new Map<string, AiHubModelUsageSummary>()
  for (const row of rows) {
    const provider = String(row['provider'] ?? 'unknown')
    const model = String(row['model'] ?? 'unknown')
    const key = `${provider}:${model}`
    const current = byModel.get(key) ?? {
      provider,
      model,
      runs: 0,
      succeeded: 0,
      failed: 0,
      tokensIn: 0,
      tokensOut: 0,
      costPence: 0,
      lastUsedAt: null,
    }
    current.runs += 1
    const status = String(row['status'] ?? '')
    if (status === 'succeeded' || status === 'completed') current.succeeded += 1
    if (status === 'failed') current.failed += 1
    current.tokensIn += Number(row['tokens_in'] ?? 0) || 0
    current.tokensOut += Number(row['tokens_out'] ?? 0) || 0
    current.costPence += Number(row['cost_pence'] ?? 0) || 0
    if (!current.lastUsedAt && row['created_at']) current.lastUsedAt = String(row['created_at'])
    byModel.set(key, current)
  }
  return byModel
}

export function withAiHubModelUsage(resource: AiHubLiveResource, usage?: AiHubModelUsageSummary): AiHubLiveResource {
  if (!usage) return resource
  return {
    ...resource,
    metadata: {
      ...resource.metadata,
      recentRuns: String(usage.runs),
      succeededRuns: String(usage.succeeded),
      failedRuns: String(usage.failed),
      tokensIn: String(usage.tokensIn),
      tokensOut: String(usage.tokensOut),
      costPence: String(usage.costPence),
      ...(usage.lastUsedAt ? { lastUsedAt: usage.lastUsedAt } : {}),
    },
  }
}
