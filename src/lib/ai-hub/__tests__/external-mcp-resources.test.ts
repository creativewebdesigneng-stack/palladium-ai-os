import { describe, expect, it } from 'vitest'
import { toAiHubExternalMcpResources } from '../resources'

describe('AI Hub external MCP resource mapping', () => {
  it('projects only allowed tools without exposing credentials or endpoints', () => {
    const resources = toAiHubExternalMcpResources({
      id: 'server-1',
      name: 'Store MCP',
      slug: 'store-mcp',
      endpoint_url: 'https://private.example/mcp',
      auth_header_name: 'Authorization',
      auth_header_ciphertext: 'must-never-leak',
      enabled: true,
      requires_approval: true,
      allowed_tool_names: ['orders.list'],
      cached_tools: [
        { name: 'orders.list', description: 'List orders.' },
        { name: 'orders.delete', description: 'Delete an order.' },
      ],
      last_discovered_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:01:00Z',
    })

    expect(resources).toHaveLength(2)
    expect(resources[0]).toMatchObject({
      id: 'server-1', kind: 'mcp', status: 'enabled', providerId: 'external-mcp:server-1',
      capabilities: ['orders.list'], metadata: { source: 'external', slug: 'store-mcp', requiresApproval: 'true', toolCount: '1' },
    })
    expect(resources[1]).toMatchObject({
      id: 'server-1:orders.list', kind: 'tool', name: 'orders.list', providerId: 'external-mcp:server-1',
      metadata: { source: 'external-mcp', server: 'store-mcp', access: 'external', requiresApproval: 'true' },
    })
    const serialized = JSON.stringify(resources)
    expect(serialized).not.toContain('must-never-leak')
    expect(serialized).not.toContain('Authorization')
    expect(serialized).not.toContain('private.example')
    expect(serialized).not.toContain('orders.delete')
  })
})
