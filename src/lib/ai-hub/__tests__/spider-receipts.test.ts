import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { receiptsForSpiderNode, toAiHubSpiderReceipts } from '../spider-receipts'

function approval(
  id: string,
  status: string,
  execution_status: string | null,
  providerId = 'palladium-agent-runtime',
  capabilityId = 'agent-1',
) {
  return {
    id, action_type: 'ai_hub_execution', status, execution_status,
    created_at: '2026-10-20T12:00:00Z',
    executed_at: '2026-10-20T12:05:00Z',
    details: {
      ai_hub_workload_id: 'agent:agent-1',
      ai_hub_provider_id: providerId,
      ai_hub_capability_id: capabilityId,
      ai_hub_input_fingerprint: 'must-not-leak',
      secret: 'must-not-leak',
    },
    execution_result: { rawToolOutput: 'must-not-leak' },
    goal: 'must-not-leak',
  }
}

describe('AI Hub Spider recorded approval evidence', () => {
  it('distinguishes awaited approval, approved, running and recorded results', () => {
    const receipts = toAiHubSpiderReceipts([
      approval('pending', 'pending', null),
      approval('approved', 'approved', null),
      approval('executing', 'approved', 'executing'),
      approval('success', 'approved', 'succeeded'),
      approval('failed', 'approved', 'failed'),
      approval('rejected', 'rejected', null),
    ])
    expect(receipts.map((r) => r.status)).toEqual([
      'awaiting-approval', 'approved-not-executed', 'executing',
      'recorded-success', 'recorded-failure', 'not-executed',
    ])
    expect(receipts[0]?.executedAt).toBeNull()
    expect(receipts[3]?.executedAt).toBe('2026-10-20T12:05:00Z')
    expect(receipts[5]?.executedAt).toBeNull()
  })

  it('returns only allowlisted fields; input, raw results and fingerprint are never exposed', () => {
    const receipts = toAiHubSpiderReceipts([approval('1', 'approved', 'succeeded')])
    expect(receipts).toEqual([{
      id: '1',
      providerId: 'palladium-agent-runtime',
      capabilityId: 'agent-1',
      workloadId: 'agent:agent-1',
      status: 'recorded-success',
      createdAt: '2026-10-20T12:00:00Z',
      executedAt: '2026-10-20T12:05:00Z',
      source: 'approval_requests',
    }])
    expect(JSON.stringify(receipts)).not.toContain('must-not-leak')
  })

  it('excludes malformed, non-AI-Hub, or incomplete receipts and bounds reads', () => {
    const other = { ...approval('other', 'approved', 'succeeded'), action_type: 'external_mcp' }
    const bad = { ...approval('bad', 'approved', 'succeeded'), details: null }
    const invalid = { ...approval('date', 'approved', 'succeeded'), created_at: 'bad-date' }
    expect(toAiHubSpiderReceipts([other, bad, invalid])).toEqual([])
    const many = Array.from({ length: 150 }, (_, i) => approval(String(i), 'pending', null))
    expect(toAiHubSpiderReceipts(many)).toHaveLength(100)
  })

  it('matches existing nodes by both capability and provider to prevent collisions', () => {
    const receipts = toAiHubSpiderReceipts([
      approval('first', 'approved', 'succeeded'),
      approval('second', 'approved', 'failed', 'external-mcp:server-1', 'agent-1'),
    ])
    expect(receiptsForSpiderNode(receipts, { providerId: 'palladium-agent-runtime', id: 'agent-1' }).map((r) => r.id)).toEqual(['first'])
    expect(receiptsForSpiderNode(receipts, { providerId: 'external-mcp:server-1', id: 'agent-1' }).map((r) => r.id)).toEqual(['second'])
  })
})

const server = readFileSync(new URL('../spider-receipts.functions.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('../../../screens/AIHub.jsx', import.meta.url), 'utf8')
const explorer = readFileSync(new URL('../../../components/ai-hub/AiHubDecisionExplorer.jsx', import.meta.url), 'utf8')
const spider = readFileSync(new URL('../../../components/ai-hub/AiHubSpiderNetwork.jsx', import.meta.url), 'utf8')

describe('AI Hub Spider approval evidence boundary', () => {
  it('authenticates owner-scoped read-only approval state through existing RLS', () => {
    expect(server).toContain('requireSupabaseAuth')
    expect(server).toContain(".from('approval_requests')")
    expect(server).toContain(".eq('user_id', context.userId)")
    expect(server).toContain(".eq('action_type', 'ai_hub_execution')")
    expect(server).toContain('toAiHubSpiderReceipts')
    expect(server).not.toContain('supabaseAdmin')
    expect(server).not.toContain('.insert(')
    expect(server).not.toContain('.update(')
    expect(server).not.toContain('.delete(')
  })

  it('shows the evidence in the existing spider and does not dispatch actions', () => {
    expect(screen).toContain('useServerFn(listAiHubSpiderReceipts)')
    expect(screen).toContain("enabled:session === 'yes'")
    expect(explorer).toContain('receipts={receipts}')
    expect(spider).toContain('receiptsForSpiderNode')
    expect(spider).toContain('Does not independently confirm provider success.')
    expect(spider).not.toContain('executeAiHubAgent')
    expect(spider).not.toContain('approved: true')
  })
})
