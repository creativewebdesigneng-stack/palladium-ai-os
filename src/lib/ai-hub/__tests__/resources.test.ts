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

  it('maps an existing MCP server and cached tools without leaking connection secrets', () => {
    const resources = toAiHubMcpResources({
      id: 'mcp-1',
      name: 'Docs MCP',
      slug: 'docs',
      endpoint_url: 'https://private.example.test/rpc',
      auth_header_name: 'Authorization',
      auth_header_ciphertext: 'encrypted-secret',
      enabled: true,
      requires_approval: true,
      allowed_tool_names: ['search'],
      cached_tools: [
        { name: 'search', description: 'Search docs', inputSchema: { type: 'object' } },
        { name: 'write', description: 'Write docs', inputSchema: { type: 'object' } },
      ],
      last_discovered_at: '2026-08-31T13:00:00Z',
      updated_at: '2026-08-31T13:05:00Z',
    })

    expect(resources).toHaveLength(2)
    expect(resources[0]).toEqual({
      id: 'mcp-1',
      kind: 'mcp',
      name: 'Docs MCP',
      status: 'enabled',
      providerId: 'palladium-mcp-runtime',
      capabilities: ['search'],
      metadata: {
        slug: 'docs',
        requiresApproval: 'true',
        toolCount: '1',
        lastDiscoveredAt: '2026-08-31T13:00:00Z',
        updatedAt: '2026-08-31T13:05:00Z',
      },
    })
    expect(resources[1]).toEqual({
      id: 'mcp-1:search',
      kind: 'tool',
      name: 'search',
      status: 'available',
      providerId: 'palladium-mcp-runtime',
      capabilities: ['mcp-tool'],
      metadata: {
        mcpServerId: 'mcp-1',
        mcpServerName: 'Docs MCP',
        mcpServerSlug: 'docs',
        requiresApproval: 'true',
        description: 'Search docs',
      },
    })

    const serialised = JSON.stringify(resources)
    expect(serialised).not.toContain('endpoint_url')
    expect(serialised).not.toContain('Authorization')
    expect(serialised).not.toContain('encrypted-secret')
    expect(serialised).not.toContain('write')
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
      ...toAiHubMcpResources({
        id: 'mcp-1',
        name: 'Docs MCP',
        enabled: true,
        cached_tools: [{ name: 'search' }],
      }),
      toAiHubLiveResource({ id: 'w' }, 'workflow', 'palladium-workflows'),
    ]

    expect(countAiHubResources(resources)).toEqual({
      models: 1,
      agents: 2,
      mcp: 1,
      tools: 1,
      workflows: 1,
      total: 6,
    })
  })
})
