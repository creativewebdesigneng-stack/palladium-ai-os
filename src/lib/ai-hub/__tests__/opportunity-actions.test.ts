import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AiHubCapabilityRef } from '../contracts'
import {
  buildOpportunityActionCards,
  executionStagesForOpportunity,
  inferOpportunityKind,
  signalsFromAutonomousPortfolio,
} from '../opportunity-actions'
import type { BlackstarOpportunityRecommendation } from '../opportunities'

const screen = readFileSync(
  fileURLToPath(new URL('../../../screens/AutonomousOS.jsx', import.meta.url)),
  'utf8',
)
const functionsSource = readFileSync(
  fileURLToPath(new URL('../opportunity-execution.functions.ts', import.meta.url)),
  'utf8',
)

const capabilities: AiHubCapabilityRef[] = [
  {
    id: 'research-agent',
    kind: 'agent',
    providerId: 'palladium-agent-runtime',
    name: 'Research',
    capabilities: ['agent-execution', 'web_search'],
    deploymentTargets: ['palladium-cloud'],
  },
  {
    id: 'ops-workflow',
    kind: 'workflow',
    providerId: 'palladium-workflows',
    name: 'Ops',
    capabilities: ['workflow-execution'],
    deploymentTargets: ['palladium-cloud'],
  },
]

describe('Blackstar autonomous opportunity actions', () => {
  it('classifies failed runs as risk and expansion goals as growth', () => {
    expect(inferOpportunityKind(
      { id: 'g1', name: 'Tokyo expansion', objective: 'Launch a new market', status: 'active' },
      { goal_id: 'g1', status: 'failed', error: 'tool timeout' },
    )).toBe('risk')
    expect(inferOpportunityKind(
      { id: 'g2', name: 'Tokyo expansion', objective: 'Launch a new market', status: 'active' },
      { goal_id: 'g2', status: 'completed' },
    )).toBe('growth')
  })

  it('builds owner-scoped signals only from live goals', () => {
    const signals = signalsFromAutonomousPortfolio([
      { id: 'live', name: 'Retain customers', objective: 'Respond to churn alerts', status: 'active', trigger_type: 'event', event_match: 'payment failed' },
      { id: 'done', name: 'Old mission', objective: 'Already finished', status: 'completed' },
    ], [])
    expect(signals).toHaveLength(1)
    expect(signals[0]?.id).toBe('live')
    expect(signals[0]?.kind).toBe('customer')
    expect(signals[0]?.evidence).toContain('goal:live')
  })

  it('plans a routed action against existing owner capabilities without inventing providers', () => {
    const cards = buildOpportunityActionCards({
      tenantId: 'user-1',
      actorId: 'user-1',
      goals: [{
        id: 'goal-1',
        name: 'Expand Tokyo',
        objective: 'Launch a governed growth experiment in Tokyo',
        status: 'active',
        autonomy_level: 'guarded',
        trigger_type: 'manual',
      }],
      runs: [],
      capabilities,
    })
    expect(cards).toHaveLength(1)
    expect(cards[0]?.routingStatus).toBe('ready')
    expect(cards[0]?.plan?.intelligence.capabilityIds).toEqual(expect.arrayContaining(['research-agent']))
    expect(cards[0]?.recommendation.recommendedAction).toMatch(/governed growth experiment/i)
  })

  it('holds risk-class actions for approval instead of treating them as auto-ready', () => {
    const cards = buildOpportunityActionCards({
      tenantId: 'user-1',
      actorId: 'user-1',
      goals: [{
        id: 'goal-2',
        name: 'Payment failures',
        objective: 'Investigate repeated payment failures',
        status: 'active',
        last_scheduler_error: 'worker timeout',
      }],
      runs: [{ goal_id: 'goal-2', status: 'failed', error: 'worker timeout' }],
      capabilities,
    })
    expect(cards[0]?.recommendation.kind).toBe('risk')
    expect(cards[0]?.recommendation.requiresApproval).toBe(true)
    expect(cards[0]?.routingStatus).toBe('waiting_for_approval')
  })

  it('fails closed when the owner has no routable capabilities', () => {
    const recommendation: BlackstarOpportunityRecommendation = {
      signalId: 'goal-3',
      kind: 'operations',
      title: 'Improve ops',
      summary: 'Tighten the operating loop',
      score: 0.7,
      confidence: 0.8,
      evidence: ['goal:goal-3'],
      recommendedAction: 'Create an operational improvement mission for: Improve ops',
      actionRisk: 'medium',
      requiresApproval: true,
      policyChecks: [],
    }
    expect(executionStagesForOpportunity(recommendation, []).every((stage) => stage.capabilities.length > 0)).toBe(false)
    const cards = buildOpportunityActionCards({
      tenantId: 'user-1',
      actorId: 'user-1',
      goals: [{ id: 'goal-3', name: 'Improve ops', objective: 'Tighten the operating loop', status: 'active' }],
      runs: [],
      capabilities: [],
    })
    expect(cards[0]?.routingStatus).toBe('unroutable')
    expect(cards[0]?.plan).toBeNull()
  })

  it('wires the Autonomous OS panel and existing approval gate without a second executor', () => {
    expect(screen).toContain('Recommended actions')
    expect(screen).toContain('recommendBlackstarOpportunityActions')
    expect(screen).toContain('requestBlackstarOpportunityApproval')
    expect(functionsSource).toContain('createAiHubApprovalGate')
    expect(functionsSource).toContain('recommendBlackstarOpportunityActions')
    expect(functionsSource).not.toContain("execution_status: 'executing'")
  })
})
