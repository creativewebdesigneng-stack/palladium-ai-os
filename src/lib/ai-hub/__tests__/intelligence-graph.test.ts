import { describe, expect, it } from 'vitest'
import { buildIntelligenceGraph, explainIntelligenceRelation, getConnectedIntelligence } from '../intelligence-graph'

describe('Blackstar Intelligence Graph', () => {
  const nodes = [
    { id: 'customer', domain: 'crm', label: 'Customer A', confidence: 0.95, provenanceIds: ['p1', 'p1'] },
    { id: 'order', domain: 'commerce', label: 'Order 1', confidence: 0.9 },
    { id: 'ticket', domain: 'support', label: 'Ticket 1', confidence: 0.85 },
    { id: 'weak', domain: 'crm', label: 'Weak', confidence: 0.3 },
  ]
  const edges = [
    { id: 'e1', from: 'customer', to: 'order', relation: 'placed', confidence: 0.9 },
    { id: 'e2', from: 'customer', to: 'ticket', relation: 'opened', confidence: 0.85 },
    { id: 'e3', from: 'customer', to: 'weak', relation: 'unknown', confidence: 0.9 },
  ]

  it('filters low-confidence nodes and invalid dangling edges', () => {
    const graph = buildIntelligenceGraph(nodes, edges)
    expect(graph.nodes.map((node) => node.id)).toEqual(['customer', 'order', 'ticket'])
    expect(graph.edges.map((edge) => edge.id)).toEqual(['e1', 'e2'])
    expect(graph.nodes[0]?.provenanceIds).toEqual(['p1'])
  })

  it('enforces domain boundaries', () => {
    const graph = buildIntelligenceGraph(nodes, edges, { allowedDomains: ['crm', 'commerce'] })
    expect(graph.nodes.map((node) => node.id)).toEqual(['customer', 'order'])
    expect(graph.edges.map((edge) => edge.id)).toEqual(['e1'])
  })

  it('returns connected cross-domain intelligence within bounded depth', () => {
    const graph = buildIntelligenceGraph(nodes, edges)
    expect(getConnectedIntelligence(graph, 'order', 2).map((node) => node.id).sort()).toEqual(['customer', 'ticket'])
  })

  it('explains direct relations', () => {
    const graph = buildIntelligenceGraph(nodes, edges)
    expect(explainIntelligenceRelation(graph, 'customer', 'order')?.relation).toBe('placed')
    expect(explainIntelligenceRelation(graph, 'order', 'ticket')).toBeNull()
  })
})
