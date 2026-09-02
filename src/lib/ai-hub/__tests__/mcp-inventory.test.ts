import { describe, expect, it } from 'vitest'

import { PALLADIUM_MCP_SERVER, PALLADIUM_MCP_TOOLS } from '@/lib/mcp/catalog'
import {
  countAiHubResources,
  toAiHubExternalMcpResources,
  toAiHubMcpResources,
  type AiHubLiveResource,
} from '../resources'

const SECRET_HINTS = ['token', 'secret', 'credential', 'apikey', 'api_key', 'authorization', 'password']

function metadataLeaksSecrets(resource: AiHubLiveResource) {
  return Object.entries(resource.metadata).some(([key, value]) =>
    SECRET_HINTS.some((hint) => key.toLowerCase().includes(hint) || String(value).toLowerCase().includes(hint)),
  )
}

describe('AI Hub inventory of the bundled PalladiumAI MCP surface', () => {
  const resources = toAiHubMcpResources(PALLADIUM_MCP_SERVER, PALLADIUM_MCP_TOOLS)

  it('projects one MCP server resource plus one tool resource per live tool', () => {
    expect(resources).toHaveLength(PALLADIUM_MCP_TOOLS.length + 1)
    expect(resources.filter((resource) => resource.kind === 'mcp')).toHaveLength(1)
    expect(resources.filter((resource) => resource.kind === 'tool')).toHaveLength(PALLADIUM_MCP_TOOLS.length)
  })

  it('keeps every projected resource on the existing MCP provider with stable ids', () => {
    expect(new Set(resources.map((resource) => resource.providerId))).toEqual(new Set(['palladium-mcp']))
    expect(new Set(resources.map((resource) => resource.id)).size).toBe(resources.length)
    for (const tool of PALLADIUM_MCP_TOOLS) {
      expect(resources.some((resource) => resource.id === `${PALLADIUM_MCP_SERVER.name}:${tool.name}`)).toBe(true)
    }
  })

  it('advertises the live tool names as the server capabilities', () => {
    const server = resources.find((resource) => resource.kind === 'mcp')
    expect(server?.capabilities).toEqual(PALLADIUM_MCP_TOOLS.map((tool) => tool.name))
    expect(server?.metadata.toolCount).toBe(String(PALLADIUM_MCP_TOOLS.length))
  })

  it('never projects credentials, tokens or config secrets into Hub metadata', () => {
    for (const resource of resources) expect(metadataLeaksSecrets(resource)).toBe(false)
  })

  it('handles an unconfigured MCP surface with no tools cleanly', () => {
    const empty = toAiHubMcpResources(PALLADIUM_MCP_SERVER, [])
    expect(empty).toHaveLength(1)
    expect(empty[0]?.capabilities).toEqual([])
    expect(empty[0]?.metadata.toolCount).toBe('0')
    expect(countAiHubResources(empty)).toMatchObject({ mcp: 1, tools: 0, total: 1 })
  })

  it('handles an external MCP server that has never been discovered', () => {
    const projected = toAiHubExternalMcpResources({ id: 'ext-1', slug: 'acme', name: 'Acme MCP', enabled: true })
    expect(projected).toHaveLength(1)
    expect(projected[0]).toMatchObject({ kind: 'mcp', providerId: 'external-mcp:ext-1', capabilities: [] })
    expect(projected.every((resource) => !metadataLeaksSecrets(resource))).toBe(true)
  })

  it('counts bundled and external MCP resources together alongside other kinds', () => {
    const external = toAiHubExternalMcpResources({
      id: 'ext-1',
      slug: 'acme',
      name: 'Acme MCP',
      enabled: true,
      cached_tools: [{ name: 'search', description: 'Search Acme.' }],
    })
    const counts = countAiHubResources([...resources, ...external])
    expect(counts.mcp).toBe(2)
    expect(counts.tools).toBe(PALLADIUM_MCP_TOOLS.length + 1)
    expect(counts.total).toBe(resources.length + external.length)
  })
})
