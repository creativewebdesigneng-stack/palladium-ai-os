export interface IntelligenceNode {
  id: string
  domain: string
  label: string
  confidence: number
  provenanceIds?: string[]
}

export interface IntelligenceEdge {
  id: string
  from: string
  to: string
  relation: string
  confidence: number
  provenanceIds?: string[]
}

export interface IntelligenceGraphPolicy {
  allowedDomains?: string[]
  minConfidence?: number
  maxNodes?: number
  maxEdges?: number
}

export interface IntelligenceGraph {
  nodes: IntelligenceNode[]
  edges: IntelligenceEdge[]
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function buildIntelligenceGraph(
  nodes: IntelligenceNode[],
  edges: IntelligenceEdge[],
  policy: IntelligenceGraphPolicy = {},
): IntelligenceGraph {
  const minConfidence = policy.minConfidence ?? 0.6
  const maxNodes = Math.max(1, policy.maxNodes ?? 500)
  const maxEdges = Math.max(1, policy.maxEdges ?? 1500)
  const allowedDomains = policy.allowedDomains ? new Set(policy.allowedDomains) : null

  const acceptedNodes = nodes
    .filter((node) => node.id.trim() && node.label.trim() && node.domain.trim())
    .map((node) => ({ ...node, confidence: clamp01(node.confidence), provenanceIds: [...new Set(node.provenanceIds ?? [])] }))
    .filter((node) => node.confidence >= minConfidence)
    .filter((node) => !allowedDomains || allowedDomains.has(node.domain))
    .slice(0, maxNodes)

  const nodeIds = new Set(acceptedNodes.map((node) => node.id))
  const acceptedEdges = edges
    .filter((edge) => edge.id.trim() && edge.relation.trim())
    .map((edge) => ({ ...edge, confidence: clamp01(edge.confidence), provenanceIds: [...new Set(edge.provenanceIds ?? [])] }))
    .filter((edge) => edge.confidence >= minConfidence)
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to)
    .slice(0, maxEdges)

  return { nodes: acceptedNodes, edges: acceptedEdges }
}

export function getConnectedIntelligence(
  graph: IntelligenceGraph,
  nodeId: string,
  depth = 1,
): IntelligenceNode[] {
  const maxDepth = Math.max(0, Math.min(5, depth))
  const byId = new Map(graph.nodes.map((node) => [node.id, node]))
  const adjacency = new Map<string, Set<string>>()
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set())
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set())
    adjacency.get(edge.from)!.add(edge.to)
    adjacency.get(edge.to)!.add(edge.from)
  }

  const visited = new Set<string>([nodeId])
  let frontier = new Set<string>([nodeId])
  for (let level = 0; level < maxDepth; level += 1) {
    const next = new Set<string>()
    for (const current of frontier) {
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor)
          next.add(neighbor)
        }
      }
    }
    frontier = next
  }
  visited.delete(nodeId)
  return [...visited].map((id) => byId.get(id)).filter((node): node is IntelligenceNode => Boolean(node))
}

export function explainIntelligenceRelation(
  graph: IntelligenceGraph,
  from: string,
  to: string,
): IntelligenceEdge | null {
  return graph.edges.find((edge) =>
    (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from),
  ) ?? null
}
