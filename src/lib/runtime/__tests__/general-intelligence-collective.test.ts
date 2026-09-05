import { describe, expect, it } from 'vitest'
import {
  COLLECTIVE_PROPOSAL_INSTRUCTION,
  renderCollectiveConsensusEvidence,
  resolveGeneralIntelligenceCollective,
} from '../general-intelligence-collective.server'
import type { GeneralIntelligenceOrchestrationResult } from '../general-intelligence-orchestration.server'

function sbWithIdentities(rows: Array<{ agent_id: string; canonical_id: string; status: string }>) {
  const query = {
    select() { return this },
    eq() { return this },
    async in() { return { data: rows, error: null } },
  }
  return { from: () => query }
}

function output(answerKey: string, confidence: number, answer: string, evidenceRefs: string[] = []) {
  return JSON.stringify({ answerKey, confidence, answer, evidenceRefs })
}

function orchestration(outputs: Array<{ agent: string; output: string }>): GeneralIntelligenceOrchestrationResult {
  return {
    status: 'completed',
    results: outputs.map((item, index) => ({
      assignment_id: `assignment-${index + 1}`,
      agent_id: item.agent,
      status: 'completed' as const,
      output: item.output,
    })),
  }
}

describe('General Intelligence collective consensus', () => {
  it('reuses trusted Blackstar consensus and preserves provenance plus dissent', async () => {
    const result = await resolveGeneralIntelligenceCollective({
      sb: sbWithIdentities([
        { agent_id: 'a1', canonical_id: 'blackstar:a1', status: 'active' },
        { agent_id: 'a2', canonical_id: 'blackstar:a2', status: 'active' },
        { agent_id: 'a3', canonical_id: 'blackstar:a3', status: 'active' },
      ]),
      userId: 'user-1',
      orchestration: orchestration([
        { agent: 'a1', output: output('approve', 0.9, 'Approve because evidence one supports it.', ['doc:1']) },
        { agent: 'a2', output: output('approve', 0.8, 'Approve based on independent evidence two.', ['doc:2']) },
        { agent: 'a3', output: output('reject', 0.7, 'Reject because evidence three conflicts.', ['doc:3']) },
      ]),
    })

    expect(result.consensus.status).toBe('consensus')
    expect(result.consensus.selectedAnswerKey).toBe('approve')
    expect(result.consensus.agreementRatio).toBeCloseTo(2 / 3)
    expect(result.consensus.dissentingAgentIds).toEqual(['a3'])
    expect(result.consensus.evidenceRefs).toEqual(['doc:1', 'doc:2'])
    expect(result.answers).toHaveLength(3)
  })

  it('surfaces a tied population as contested rather than inventing agreement', async () => {
    const result = await resolveGeneralIntelligenceCollective({
      sb: sbWithIdentities([
        { agent_id: 'a1', canonical_id: 'blackstar:a1', status: 'active' },
        { agent_id: 'a2', canonical_id: 'blackstar:a2', status: 'active' },
      ]),
      userId: 'user-1',
      orchestration: orchestration([
        { agent: 'a1', output: output('alpha', 0.8, 'Alpha answer') },
        { agent: 'a2', output: output('beta', 0.8, 'Beta answer') },
      ]),
    })

    expect(result.consensus.status).toBe('contested')
    expect(result.consensus.agreementRatio).toBe(0.5)
    const rendered = renderCollectiveConsensusEvidence(result)
    expect(rendered).toContain('Status: contested')
    expect(rendered).toContain('preserve the disagreement')
    expect(rendered).toContain('advisory evidence only')
  })

  it('fails closed when fewer than two independent agents complete', async () => {
    await expect(resolveGeneralIntelligenceCollective({
      sb: sbWithIdentities([{ agent_id: 'a1', canonical_id: 'blackstar:a1', status: 'active' }]),
      userId: 'user-1',
      orchestration: orchestration([
        { agent: 'a1', output: output('approve', 0.9, 'Only proposal') },
      ]),
    })).rejects.toThrow('COLLECTIVE_INSUFFICIENT_PROPOSALS')
  })

  it('requires an active trusted identity for every participating agent', async () => {
    await expect(resolveGeneralIntelligenceCollective({
      sb: sbWithIdentities([
        { agent_id: 'a1', canonical_id: 'blackstar:a1', status: 'active' },
      ]),
      userId: 'user-1',
      orchestration: orchestration([
        { agent: 'a1', output: output('approve', 0.9, 'First') },
        { agent: 'a2', output: output('approve', 0.8, 'Second') },
      ]),
    })).rejects.toThrow('COLLECTIVE_TRUST_IDENTITY_REQUIRED')
  })

  it('rejects malformed agent output rather than deriving a fake proposal from prose', async () => {
    await expect(resolveGeneralIntelligenceCollective({
      sb: sbWithIdentities([
        { agent_id: 'a1', canonical_id: 'blackstar:a1', status: 'active' },
        { agent_id: 'a2', canonical_id: 'blackstar:a2', status: 'active' },
      ]),
      userId: 'user-1',
      orchestration: orchestration([
        { agent: 'a1', output: 'I think we should approve.' },
        { agent: 'a2', output: output('approve', 0.8, 'Structured answer') },
      ]),
    })).rejects.toThrow('COLLECTIVE_INVALID_STRUCTURED_OUTPUT')
  })

  it('instructs specialists to stay independent and avoid fabricated evidence or consensus', () => {
    expect(COLLECTIVE_PROPOSAL_INSTRUCTION).toContain('Return ONLY one JSON object')
    expect(COLLECTIVE_PROPOSAL_INSTRUCTION).toContain('Do not invent citations, consensus, permissions, tool results, or evidence')
    expect(COLLECTIVE_PROPOSAL_INSTRUCTION).toContain('proposal must be independent')
  })
})
