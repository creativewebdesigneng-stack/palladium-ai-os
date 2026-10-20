import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveSpiderPreparedAction } from '../spider-actions'
import type { AiHubLiveResource } from '../resources'

const make = (id: string, kind: AiHubLiveResource['kind'], providerId: string, status: string): AiHubLiveResource => ({
  id, name: 'Registered ' + kind, kind, providerId, status, capabilities: ['search'], metadata: {},
})
const inventory = [
  make('agent-1', 'agent', 'palladium-agent-runtime', 'active'),
  make('workflow-1', 'workflow', 'palladium-workflows', 'active'),
  make('mcp-1:search', 'tool', 'external-mcp:mcp-1', 'available'),
  make('model-1', 'model', 'palladium-model-gateway', 'available'),
  make('disabled-agent', 'agent', 'palladium-agent-runtime', 'disabled'),
  make('skill-1', 'tool', 'palladium-skills', 'enabled'),
]

describe('Astra Spider authorised resource preparation', () => {
  it('passes a task into an existing active agent/workflow without requesting execution', () => {
    const agent = inventory[0]!
    expect(resolveSpiderPreparedAction(inventory, agent, '  Read public page  ')).toEqual({
      kind: 'agent-workflow', resource: agent, goal: 'Read public page',
    })
    const workflow = inventory[1]!
    expect(resolveSpiderPreparedAction(inventory, workflow, 'Check configuration')).toEqual({
      kind: 'agent-workflow', resource: workflow, goal: 'Check configuration',
    })
  })
  it('permits only a registered available external MCP tool to open its JSON argument form', () => {
    const mcp = inventory[2]!
    expect(resolveSpiderPreparedAction(inventory, mcp, '')).toEqual({ kind: 'external-mcp', resource: mcp })
    expect(resolveSpiderPreparedAction(inventory, inventory[5]!, 'run')).toBeNull()
  })
  it('rejects spoofed status, resource id, type and provider even if UI node claims active', () => {
    expect(resolveSpiderPreparedAction(inventory, { ...inventory[4]!, status: 'active' }, 'task')).toBeNull()
    expect(resolveSpiderPreparedAction(inventory, { ...inventory[0]!, id: 'unknown' }, 'task')).toBeNull()
    expect(resolveSpiderPreparedAction(inventory, { ...inventory[0]!, kind: 'tool' }, 'task')).toBeNull()
    expect(resolveSpiderPreparedAction(inventory, { ...inventory[0]!, providerId: 'external-mcp:any' }, 'task')).toBeNull()
    expect(resolveSpiderPreparedAction(inventory, inventory[3]!, 'task')).toBeNull()
    expect(resolveSpiderPreparedAction([], inventory[0]!, 'task')).toBeNull()
  })
  it('rejects blank and oversized agent instructions', () => {
    expect(resolveSpiderPreparedAction(inventory, inventory[0], '')).toBeNull()
    expect(resolveSpiderPreparedAction(inventory, inventory[0], ' \n ')).toBeNull()
    expect(resolveSpiderPreparedAction(inventory, inventory[0], 'x'.repeat(1001))).toBeNull()
    expect(resolveSpiderPreparedAction(inventory, null, 'task')).toBeNull()
  })
})

const screen = readFileSync(new URL('../../../screens/AIHub.jsx', import.meta.url), 'utf8')
const explorer = readFileSync(new URL('../../../components/ai-hub/AiHubDecisionExplorer.jsx', import.meta.url), 'utf8')
const spider = readFileSync(new URL('../../../components/ai-hub/AiHubSpiderNetwork.jsx', import.meta.url), 'utf8')

describe('Astra Spider existing runtime bridge', () => {
  it('connects node selection to an existing inventory form, not a new dispatcher', () => {
    expect(screen).toContain('resolveSpiderPreparedAction(inventory.data?.resources ?? [], node, taskDraft)')
    expect(screen).toContain('onPrepareResource={prepareSpiderResource}')
    expect(screen).toContain('id="ai-hub-execution"')
    expect(explorer).toContain('onPrepareResource(node, promptDraft.trim())')
    expect(spider).toContain('Prepare in existing approval controls')
    expect(spider).toContain('No action or approval request is sent')
    expect(spider).toContain('taskReady')
  })

  it('snapshots the goal and JSON payload through the same approval-resume path', () => {
    expect(screen).toContain('goal:submittedGoal')
    expect(screen).toContain('goal:variables.goal')
    expect(screen).toContain('execution.mutate({resource,goal:goal.trim()})')
    expect(screen).toContain('inputJson:submittedInput')
    expect(screen).toContain('inputJson:variables.inputJson')
    expect(screen).toContain('mcpExecution.mutate({resource:selectedMcp,inputJson:mcpInput})')
    expect(screen).toContain('resume={() => execution.mutate(approval)}')
    expect(screen).toContain('resume={()=>mcpExecution.mutate(mcpApproval)}')
  })
  it('does not grant approval or execution authority to spider nodes', () => {
    expect(spider).not.toContain('executeAiHubAgent')
    expect(spider).not.toContain('executeAiHubExternalMcp')
    expect(spider).not.toContain('approve(')
    expect(spider).not.toContain('approvalRequestId')
    expect(explorer).not.toContain('runHubMcp')
  })
})
