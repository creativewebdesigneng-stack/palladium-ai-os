import { describe, expect, it } from 'vitest'
import {
  countAiHubResources,
  toAiHubLiveResource,
  toAiHubMcpResources,
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
      toAiHubLiveResource(
        { id: 'workflow-1', name: 'Fulfil Orders' },
        'workflow',
        'palladium-workflows',
      ),
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
        {
          name: 'list_agents',
          title: 'List AI agents',
          description: 'List tenant-visible agents.',
          area: 'Agents',
          access: 'read',
        },
        {
          name: 'create_agent',
          title: 'Create AI agent',
          description: 'Create an agent.',
          area: 'Agents',
          access: 'write',
        },
      ],
    )

    expect(resources).toEqual([
      {
        id: 'palladiumai',
        kind: 'mcp',
        name: 'PalladiumAI',
        status: 'available',
        providerId: 'palladium-mcp',
        capabilities: ['list_agents', 'create_agent'],
        metadata: {
          version: '0.1.0',
          auth: 'Supabase OAuth',
          resourcePath: '/mcp',
          listToolsPath: '/.mcp/list-tools',
          toolCount: '2',
        },
      },
      {
        id: 'palladiumai:list_agents',
        kind: 'tool',
        name: 'List AI agents',
        status: 'available',
        providerId: 'palladium-mcp',
        capabilities: ['list_agents'],
        metadata: {
          server: 'palladiumai',
          area: 'Agents',
          access: 'read',
          description: 'List tenant-visible agents.',
        },
      },
      {
        id: 'palladiumai:create_agent',
        kind: 'tool',
        name: 'Create AI agent',
        status: 'available',
        providerId: 'palladium-mcp',
        capabilities: ['create_agent'],
        metadata: {
          server: 'palladiumai',
          area: 'Agents',
          access: 'write',
          description: 'Create an agent.',
        },
      },
    ])
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
        {
          name: 'palladiumai',
          title: 'PalladiumAI',
          version: '0.1.0',
          resourcePath: '/mcp',
          listToolsPath: '/.mcp/list-tools',
          auth: 'Supabase OAuth',
        },
        [{ name: 'list_agents', title: 'List agents', description: '', area: 'Agents', access: 'read' }],
      ),
      toAiHubLiveResource({ id: 'w' }, 'workflow', 'palladium-workflows'),
    ]

    expect(countAiHubResources(resources)).toEqual({
      models: 1,
      agents: 2,
      tools: 1,
      mcp: 1,
      workflows: 1,
      total: 6,
    })
  })
})
