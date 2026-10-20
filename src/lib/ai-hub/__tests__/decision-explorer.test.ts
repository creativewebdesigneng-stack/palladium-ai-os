import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const screen = readFileSync(new URL('../../../screens/AIHub.jsx', import.meta.url), 'utf8')
const explorer = readFileSync(new URL('../../../components/ai-hub/AiHubDecisionExplorer.jsx', import.meta.url), 'utf8')

describe('AI Hub evidence routing explorer', () => {
  it('uses existing tenant-scoped Hub inventory and the existing intelligence router', () => {
    expect(screen).toContain("import AiHubDecisionExplorer from '@/components/ai-hub/AiHubDecisionExplorer'")
    expect(screen).toContain('<AiHubDecisionExplorer resources={inventory.data?.resources ?? []}')
    expect(explorer).toContain("import { routeAiHubWorkload } from '@/lib/ai-hub/router'")
    expect(explorer).toContain("evidenceRouting: { mode: 'evidence-gated' }")
  })
  it('makes no network or agent execution calls and labels the result as only a plan', () => {
    expect(explorer).toContain('Planning only')
    expect(explorer).toContain('No task or model is executed.')
    expect(explorer).toContain('Missing telemetry is not treated as proof of success.')
    expect(explorer).not.toContain('executeAiHubAgent')
    expect(explorer).not.toContain('executeAiHubWorkflow')
    expect(explorer).not.toContain('runHubMcp')
  })
})
