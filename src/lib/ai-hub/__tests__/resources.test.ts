import { describe, expect, it } from 'vitest'
import {
  countAiHubResources,
  toAiHubLiveResource,
  toAiHubMcpResources,
  toAiHubSkillResource,
  type AiHubLiveResource,
} from '../resources'

describe('AI Hub live resource mapping', () => {
  it('normalizes an existing agent without duplicating its source of truth', () => {
    const resource = toAiHubLiveResource(
      {
        id: 'agent-1',
        name: 'Store Operator',
        status: 'active',
        model: 'gpt-5',
        model_provider: 'openai',
        allowed_tools: ['shopify', 'email'],
        updated_at: '2026-08-31T12:00:00Z',
      },
      'agent',
      'palladium-agent-runtime',
    )

    expect(resource).toEqual({
      id: 'agent-1',
      kind: 'agent',
      name: 'Store Operator',
      status: 'active',
      providerId: 'palladium-agent-runtime',
      capabilities: ['shopify', 'email'],
      metadata: {
        model: 'gpt-5',
        modelProvider: 'openai',
        updatedAt: '2026-08-31T12:00:00Z',
      },
    })
  })

  it('provides safe defaults for workflow records', () => {
    expect(
      toAiHubLiveResource({ id: 'workflow-1', name: 'Fulfil Orders' }, 'workflow', 'palladium-workflows'),
    ).toEqual({
      id: 'workflow-1',
      kind: 'workflow',
      name: 'Fulfil Orders',
      status: 'available',
      providerId: 'palladium-workflows',
      capabilities: [],
      metadata: {},
    })
  })

  it('projects tenant Skills without exposing executable package bodies', () => {
    expect(toAiHubSkillResource({
      id: 'skill-1',
      name: 'Safe deploy',
      description: 'Deploy after checks.',
      version: '1.2.0',
      requires_tools: ['github.pr.read', 'vercel.deployment.read'],
      requires_scripts: ['scripts/check.mjs'],
      dangerous: false,
      scan_verdict: 'safe',
      source_kind: 'builtin',
      enabled: true,
      updated_at: '2026-09-01T00:00:00Z',
      body: 'must never be projected',
      files: [{ path: 'SKILL.md', content: 'must never be projected' }],
    })).toEqual({
      id: 'skill-1',
      kind: 'tool',
      name: 'Safe deploy',
      status: 'enabled',
      providerId: 'palladium-skills',
      capabilities: ['github.pr.read', 'vercel.deployment.read'],
      metadata: {
        resourceType: 'skill',
        description: 'Deploy after checks.',
        version: '1.2.0',
        sourceKind: 'builtin',
        scanVerdict: 'safe',
        dangerous: 'false',
        requiresScripts: 'true',
        scriptCount: '1',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    })
  })

  it('projects the existing MCP catalogue into one server and tool resources', () => {
    const resources = toAiHubMcpResources(
      {
        name: 'palladiumai',
        title: 'PalladiumAI',
        version: '0.1.0',
        resourcePath: '/mcp',
        listToolsPath: '/.mcp/list-tools',
        auth: 'Supabase OAuth',
      },
      [
        { name: 'list_agents', title: 'List AI agents', description: 'List tenant-visible agents.', area: 'Agents', access: 'read' },
        { name: 'create_agent', title: 'Create AI agent', description: 'Create an agent.', area: 'Agents', access: 'write' },
      ],
    )

    expect(resources).toHaveLength(3)
    expect(resources[0]).toMatchObject({
      id: 'palladiumai',
      kind: 'mcp',
      providerId: 'palladium-mcp',
      capabilities: ['list_agents', 'create_agent'],
    })
    expect(resources[1]).toMatchObject({ id: 'palladiumai:list_agents', kind: 'tool' })
    expect(resources[2]).toMatchObject({ id: 'palladiumai:create_agent', kind: 'tool' })
  })

  it('counts canonical resources deterministically across supported kinds', () => {
    const model: AiHubLiveResource = {
      id: 'openai:gpt-5-mini',
      kind: 'model',
      name: 'OpenAI · gpt-5-mini',
      status: 'available',
      providerId: 'palladium-model-gateway',
      capabilities: ['model-inference'],
      metadata: { modelProvider: 'openai', model: 'gpt-5-mini' },
    }
    const resources = [
      model,
      toAiHubLiveResource({ id: 'a' }, 'agent', 'palladium-agent-runtime'),
      toAiHubLiveResource({ id: 'b' }, 'agent', 'palladium-agent-runtime'),
      ...toAiHubMcpResources(
        { name: 'palladiumai', title: 'PalladiumAI', version: '0.1.0', resourcePath: '/mcp', listToolsPath: '/.mcp/list-tools', auth: 'Supabase OAuth' },
        [{ name: 'list_agents', title: 'List agents', description: '', area: 'Agents', access: 'read' }],
      ),
      toAiHubSkillResource({ id: 's', name: 'Deploy', enabled: true, requires_tools: ['deploy'] }),
      toAiHubLiveResource({ id: 'w' }, 'workflow', 'palladium-workflows'),
    ]

    expect(countAiHubResources(resources)).toEqual({
      models: 1,
      agents: 2,
      tools: 2,
      mcp: 1,
      skills: 1,
      workflows: 1,
      total: 7,
    })
  })
})
