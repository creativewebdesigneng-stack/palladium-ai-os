import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildAiHubSpiderTopology } from '../spider-network'
import { suggestSpiderCapability } from '../spider-prompt-preview'
import type { AiHubLiveResource } from '../resources'
import type { AiHubRouteDecision } from '../contracts'

function resource(id: string, kind: AiHubLiveResource['kind'], capabilities = ['search']): AiHubLiveResource {
  return { id, kind, name: id, status: 'available', providerId: 'existing-' + kind, capabilities, metadata: {} }
}

const selected: AiHubRouteDecision = {
  workloadId: 'preview',
  capability: {
    id: 'verified-model', kind: 'model', providerId: 'existing-model',
    name: 'Verified model', capabilities: ['search'], deploymentTargets: ['provider-cloud'],
  },
  reason: 'Existing router planned a model escalation',
  policyChecks: ['tenant-isolation', 'approval-required'],
  decisionTrace: {
    status: 'planned-not-executed', lane: 'model-escalation',
    selectedCapabilityId: 'verified-model',
    consideredCapabilityIds: ['verified-model', 'known-tool'],
    observedRuns: 0, reliabilityScore: 0.5, evaluationCount: 0,
    thresholds: { minObservedRuns: 20, minReliability: 0.8 },
    reasons: ['No deterministic route qualified'],
  },
}

describe('Blackstar spider web real inventory projection', () => {
  it('uses actual registered models, tools, agents and workflows with no generated phantom nodes', () => {
    const inventory = [
      resource('verified-model', 'model'),
      resource('known-tool', 'tool'),
      resource('agent-1', 'agent'),
      resource('workflow-1', 'workflow'),
    ]
    const graph = buildAiHubSpiderTopology(inventory, 'search', selected)
    expect(graph.nodes.map((node) => node.id)).toEqual([
      'verified-model', 'known-tool', 'agent-1', 'workflow-1',
    ])
    expect(graph.links).toEqual([
      { from: 'blackstar-hub', to: 'verified-model', relation: 'planned-route' },
      { from: 'blackstar-hub', to: 'known-tool', relation: 'routing-candidate' },
      { from: 'blackstar-hub', to: 'agent-1', relation: 'registered-resource' },
      { from: 'blackstar-hub', to: 'workflow-1', relation: 'registered-resource' },
    ])
    expect(graph.totalRegistered).toBe(4)
    expect(graph.totalMatching).toBe(4)
  })

  it('bounds and balances visible resources, preserving the actual selected route even at the end of a long catalogue', () => {
    const inventory = [
      ...Array.from({ length: 40 }, (_, i) => resource('model-' + i, 'model')),
      resource('known-tool', 'tool'),
      resource('agent-1', 'agent'),
      resource('workflow-1', 'workflow'),
      resource('verified-model', 'model'),
    ]
    const graph = buildAiHubSpiderTopology(inventory, 'search', selected)
    expect(graph.nodes.length).toBeLessThanOrEqual(14)
    expect(graph.nodes[0]?.id).toBe('verified-model')
    expect(graph.nodes.map((node) => node.kind)).toEqual(expect.arrayContaining(['model', 'tool', 'agent', 'workflow']))
    expect(graph.links).toHaveLength(graph.nodes.length)
  })

  it('does not invent selected links when the planned resource is absent from the authorised inventory', () => {
    const graph = buildAiHubSpiderTopology([resource('some-agent', 'agent')], 'search', selected)
    expect(graph.selectedId).toBeNull()
    expect(graph.nodes[0]?.planned).toBe(false)
    expect(graph.links[0]?.relation).toBe('registered-resource')
  })

  it('is empty for missing inventory, deduplicates resources and remains layout-deterministic', () => {
    expect(buildAiHubSpiderTopology([], 'search', selected)).toMatchObject({
      nodes: [], links: [], selectedId: null, totalRegistered: 0,
    })
    const rows = [resource('known-tool', 'tool'), resource('known-tool', 'tool')]
    const first = buildAiHubSpiderTopology(rows, 'search', selected)
    const second = buildAiHubSpiderTopology(rows, 'search', selected)
    expect(first).toEqual(second)
    expect(first.nodes).toHaveLength(1)
  })

  it('separates real inventory status from planning candidacy', () => {
    const blocked = { ...resource('known-tool', 'tool'), status: 'disabled' }
    const graph = buildAiHubSpiderTopology([blocked], 'search', selected)
    expect(graph.nodes[0]?.active).toBe(false)
    expect(graph.nodes[0]?.eligible).toBe(true)
    expect(graph.nodes[0]?.planned).toBe(false)
  })
})

const screen = readFileSync(new URL('../../../screens/AIHub.jsx', import.meta.url), 'utf8')
const explorer = readFileSync(new URL('../../../components/ai-hub/AiHubDecisionExplorer.jsx', import.meta.url), 'utf8')
const network = readFileSync(new URL('../../../components/ai-hub/AiHubSpiderNetwork.jsx', import.meta.url), 'utf8')

describe('Spider Decision Network UI integration', () => {
  it('renders the real inventory spider web in the existing AI Hub before the older topology', () => {
    expect(screen.indexOf('<AiHubDecisionExplorer')).toBeLessThan(screen.indexOf('<AiHubNetworkScene'))
    expect(explorer).toContain('import AiHubSpiderNetwork')
    expect(explorer).toContain('<AiHubSpiderNetwork resources={resources} selectedCapability={chosen} route={route} loading={loading}')
    expect(explorer).toContain('receipts={receipts} receiptError={receiptError}')
    expect(explorer).toContain('onPrepareResource={onPrepareResource ?')
    expect(explorer).toContain('taskReady={Boolean(promptDraft.trim())}')
    expect(network).toContain("buildAiHubSpiderTopology(resources, selectedCapability, route)")
  })

  it('honours reduced motion, is keyboard accessible and never claims an execution happened', () => {
    expect(network).toContain('useReducedMotion')
    expect(network).toContain('onKeyDown')
    expect(network).toContain('PLAN ONLY')
    expect(network).toContain('not executed')
    expect(network).toContain('Motion shows a proposed route')
    expect(network).not.toContain('executeAiHubAgent')
    expect(network).not.toContain('executeAiHubWorkflow')
    expect(network).not.toContain('executeAiHubExternalMcp')
    expect(network).not.toContain('approved: true')
  })
})

describe('Read-only spider prompt phrase suggestion', () => {
  const options = ['web-research', 'code-analysis', 'model-inference']
  it('suggests only a real capability with a complete literal phrase match', () => {
    expect(suggestSpiderCapability('Please help me with code analysis', options)).toEqual({
      capability: 'code-analysis', matchedTerms: ['code', 'analysis'],
    })
    expect(suggestSpiderCapability('I want web research', options)?.capability).toBe('web-research')
  })

  it('does not hallucinate a capability for unrelated, incomplete or oversized prompt content', () => {
    expect(suggestSpiderCapability('Book a table in Plymouth', options)).toBeNull()
    expect(suggestSpiderCapability('code', options)).toBeNull()
    expect(suggestSpiderCapability('x'.repeat(1001), options)).toBeNull()
    expect(suggestSpiderCapability('', options)).toBeNull()
    expect(suggestSpiderCapability('code analysis', [])).toBeNull()
  })

  it('keeps prompt entry local and requires a user click before updating the selected capability', () => {
    expect(explorer).toContain('setPromptDraft')
    expect(explorer).toContain('suggestSpiderCapability(promptDraft, options)')
    expect(explorer).toContain('onClick={() => setCapabilityName(suggested.capability)}')
    expect(explorer).toContain('no prompt is sent to a model or tool')
  })
})
