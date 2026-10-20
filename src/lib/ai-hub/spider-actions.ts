import type { AiHubLiveResource } from './resources'

export interface SpiderSelectedResource {
  id: string
  kind: string
  providerId: string
  status: string
}

export type SpiderPreparedAction =
  | { kind: 'agent-workflow'; resource: AiHubLiveResource; goal: string }
  | { kind: 'external-mcp'; resource: AiHubLiveResource }

/**
 * A narrow, read-only preparation boundary for Astra Spider.
 * It never returns an executable approval receipt and never trusts a node's
 * claimed status. The existing server functions must independently recheck
 * actor access, active state, tool allowlists and real operator approval.
 */
export function resolveSpiderPreparedAction(
  resources: readonly AiHubLiveResource[],
  node: SpiderSelectedResource | null | undefined,
  prompt: string,
): SpiderPreparedAction | null {
  if (!node || typeof node.id !== 'string' || !node.id ||
      typeof node.providerId !== 'string' || !node.providerId) return null
  const resource = resources.find((item) =>
    item.id === node.id && item.kind === node.kind && item.providerId === node.providerId
  )
  if (!resource || resource.status !== node.status) return null
  if ((resource.kind === 'agent' || resource.kind === 'workflow') && resource.status === 'active') {
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 1000) return null
    return { kind: 'agent-workflow', resource, goal: prompt.trim() }
  }
  if (resource.kind === 'tool' && resource.providerId.startsWith('external-mcp:') &&
      resource.status === 'available') {
    return { kind: 'external-mcp', resource }
  }
  return null
}
