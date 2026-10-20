import type { AiHubRouteDecision } from './contracts'
import type { AiHubLiveResource } from './resources'

export interface SpiderResourceNode {
  id: string
  name: string
  kind: string
  status: string
  providerId: string
  capabilities: string[]
  x: number
  y: number
  eligible: boolean
  planned: boolean
  active: boolean
}

/** Stable, collision-resistant identity for a visible inventory node. */
export function spiderNodeKey(node: Pick<SpiderResourceNode, 'providerId' | 'kind' | 'id'>): string {
  return JSON.stringify([node.providerId, node.kind, node.id])
}

export interface SpiderResourceLink {
  from: 'blackstar-hub'
  to: string
  relation: 'registered-resource' | 'routing-candidate' | 'planned-route'
}

export interface SpiderTopology {
  nodes: SpiderResourceNode[]
  links: SpiderResourceLink[]
  selectedId: string | null
  totalMatching: number
  totalRegistered: number
}

const KINDS = ['model', 'tool', 'agent', 'workflow', 'mcp', 'compute', 'dataset'] as const
const ACTIVE = new Set(['available', 'active', 'enabled', 'production', 'published'])
const MAX_NODES = 14

/**
 * Deterministically projects the existing tenant-scoped inventory into a
 * spider-web visual. Lines mean inventory relationship or *planning*
 * candidacy, NEVER provider calls, network traffic or completed execution.
 */
export function buildAiHubSpiderTopology(
  resources: readonly AiHubLiveResource[],
  requiredCapability: string | undefined,
  route: AiHubRouteDecision | null,
): SpiderTopology {
  const seen = new Set<string>()
  const inventory = resources.filter((resource) => {
    if (!KINDS.includes(resource.kind as (typeof KINDS)[number])) return false
    if (!resource.id || !resource.providerId || !resource.name) return false
    const id = spiderNodeKey(resource)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  const candidateIds = new Set(route?.decisionTrace?.consideredCapabilityIds ?? [])
  const selectedId = route?.decisionTrace?.selectedCapabilityId ?? null
  const idCounts = new Map<string, number>()
  for (const resource of inventory) idCounts.set(resource.id, (idCounts.get(resource.id) ?? 0) + 1)

  // Route identities must match the selected provider, kind AND ID. A raw
  // ID may exist in multiple providers; never highlight the wrong resource.
  const chosen = selectedId && route?.capability.id === selectedId
    ? inventory.find((resource) => resource.id === selectedId &&
        resource.providerId === route.capability.providerId &&
        resource.kind === route.capability.kind)
    : undefined
  const chosenKey = chosen ? spiderNodeKey(chosen) : null
  // The routing trace only exposes bare candidate IDs. When an ID collides,
  // no provider attribution is possible except for the exact selected route.
  const isEligible = (resource: AiHubLiveResource) =>
    candidateIds.has(resource.id) &&
    ((idCounts.get(resource.id) ?? 0) === 1 || spiderNodeKey(resource) === chosenKey)
  const picked: AiHubLiveResource[] = []
  const chosenIds = new Set<string>()
  const add = (resource: AiHubLiveResource | undefined) => {
    if (!resource || picked.length >= MAX_NODES) return
    const key = spiderNodeKey(resource)
    if (!chosenIds.has(key)) {
      chosenIds.add(key)
      picked.push(resource)
    }
  }
  add(chosen)
  for (const resource of inventory) {
    if (isEligible(resource)) add(resource)
  }

  // Round-robin by kind so a long model list does not hide real tools, agents
  // or workflows. Never fabricate missing resources or phantom providers.
  const kindQueues = KINDS.map((kind) => inventory.filter((resource) => resource.kind === kind))
  let cursor = 0
  while (picked.length < MAX_NODES && cursor < inventory.length) {
    for (const queue of kindQueues) add(queue[cursor])
    cursor += 1
  }

  const nodes = picked.map<SpiderResourceNode>((resource, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(1, picked.length)
    return {
      id: resource.id,
      name: resource.name,
      kind: resource.kind,
      status: resource.status,
      providerId: resource.providerId,
      capabilities: [...resource.capabilities],
      x: 500 + Math.cos(angle) * 355,
      y: 310 + Math.sin(angle) * 241,
      eligible: isEligible(resource),
      planned: spiderNodeKey(resource) === chosenKey,
      active: ACTIVE.has(resource.status),
    }
  })
  const links: SpiderResourceLink[] = nodes.map((node) => ({
    from: 'blackstar-hub',
    to: spiderNodeKey(node),
    relation: node.planned ? 'planned-route' : node.eligible ? 'routing-candidate' : 'registered-resource',
  }))
  return {
    nodes,
    links,
    selectedId: nodes.some((node) => node.planned) ? selectedId : null,
    totalMatching: inventory.filter((resource) => requiredCapability && resource.capabilities.includes(requiredCapability)).length,
    totalRegistered: inventory.length,
  }
}
