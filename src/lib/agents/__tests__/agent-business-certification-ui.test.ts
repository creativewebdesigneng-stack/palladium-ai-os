import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const panel = readFileSync(
  new URL('../../../components/agents/AgentBusinessCertificationPanel.jsx', import.meta.url),
  'utf8',
)
const detail = readFileSync(
  new URL('../../../screens/AgentDetail.jsx', import.meta.url),
  'utf8',
)

describe('agent business certification UI', () => {
  it('surfaces evidence-backed readiness in the real agent command centre', () => {
    expect(detail).toContain('AgentBusinessCertificationPanel')
    expect(detail).toContain('<AgentBusinessCertificationPanel agentId={agent.id} />')
    expect(panel).toContain('getAgentBusinessCertification')
    expect(panel).toContain('Evidence-backed agent readiness')
  })

  it('does not present configuration alone as certification', () => {
    expect(panel).toContain('Capabilities are not certified from configuration alone')
    expect(panel).toContain('verifier score of at least 0.90')
    expect(panel).toContain('Certification never grants new permissions')
    expect(panel).toContain('Money-affecting actions remain approval-gated')
  })
})
